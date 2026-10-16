// Package lombokresilience provides small resilience primitives with explicit time:
// EWMA, circuit breaker, backoff with jitter and candidate ranking. Part of the Lombok Ecosystem.
package lombokresilience

import (
	"errors"
	"math"
	"sort"
)

// ErrRange reports an argument outside the range defined by the SPEC.
var ErrRange = errors.New("lombokresilience: argument out of range")

// Ewma is an exponentially weighted moving average. The first sample becomes the value.
type Ewma struct {
	alpha float64
	v     float64
	set   bool
}

// NewEwma returns an Ewma with alpha in (0, 1].
func NewEwma(alpha float64) (*Ewma, error) {
	if !(alpha > 0 && alpha <= 1) {
		return nil, ErrRange
	}
	return &Ewma{alpha: alpha}, nil
}

// Value returns the current value and whether any sample has been seen.
func (e *Ewma) Value() (float64, bool) { return e.v, e.set }

// Update adds a sample (finite and >= 0) and returns the new value.
func (e *Ewma) Update(sample float64) (float64, error) {
	if math.IsNaN(sample) || math.IsInf(sample, 0) || sample < 0 {
		return 0, ErrRange
	}
	if !e.set {
		e.v, e.set = sample, true
	} else {
		// explicit conversions prevent fused multiply-add so results match other ports exactly
		a := float64(e.alpha * sample)
		b := float64((1 - e.alpha) * e.v)
		e.v = a + b
	}
	return e.v, nil
}

// BreakerConfig configures a Breaker.
type BreakerConfig struct {
	FailureThreshold int64 `json:"failureThreshold"`
	CooldownMs       int64 `json:"cooldownMs"`
	HalfOpenProbes   int64 `json:"halfOpenProbes"`
}

// Breaker is a circuit breaker with states "closed", "open" and "half_open".
type Breaker struct {
	cfg      BreakerConfig
	state    string
	failures int64
	openedAt int64
	probes   int64
}

// NewBreaker validates cfg and returns a closed Breaker.
func NewBreaker(cfg BreakerConfig) (*Breaker, error) {
	if cfg.FailureThreshold < 1 || cfg.CooldownMs < 0 || cfg.HalfOpenProbes < 1 {
		return nil, ErrRange
	}
	return &Breaker{cfg: cfg, state: "closed"}, nil
}

// State returns the current state without causing a transition.
func (b *Breaker) State() string { return b.state }

// Allow reports whether a call may proceed at nowMs.
func (b *Breaker) Allow(nowMs int64) bool {
	switch b.state {
	case "closed":
		return true
	case "open":
		if nowMs-b.openedAt < b.cfg.CooldownMs {
			return false
		}
		b.state, b.probes = "half_open", 1
		return true
	}
	if b.probes < b.cfg.HalfOpenProbes {
		b.probes++
		return true
	}
	return false
}

// OnSuccess records a successful call.
func (b *Breaker) OnSuccess(nowMs int64) {
	switch b.state {
	case "closed":
		b.failures = 0
	case "half_open":
		b.state, b.failures, b.probes = "closed", 0, 0
	}
}

// OnFailure records a failed call.
func (b *Breaker) OnFailure(nowMs int64) {
	switch b.state {
	case "closed":
		b.failures++
		if b.failures >= b.cfg.FailureThreshold {
			b.state, b.openedAt = "open", nowMs
		}
	case "half_open":
		b.state, b.openedAt, b.probes = "open", nowMs, 0
	}
}

// BackoffConfig configures BackoffDelay. Jitter is "none", "full" or "equal".
type BackoffConfig struct {
	BaseMs float64 `json:"baseMs"`
	Factor float64 `json:"factor"`
	MaxMs  float64 `json:"maxMs"`
	Jitter string  `json:"jitter"`
}

// BackoffDelay returns the retry delay in whole milliseconds. attempt starts at 0; rand is in [0, 1).
func BackoffDelay(attempt int, cfg BackoffConfig, rand float64) (int64, error) {
	if attempt < 0 || !(cfg.BaseMs >= 0) || !(cfg.Factor >= 1) || !(cfg.MaxMs >= 0) || !(rand >= 0 && rand < 1) {
		return 0, ErrRange
	}
	d := math.Min(cfg.BaseMs, cfg.MaxMs)
	for i := 0; i < attempt && d < cfg.MaxMs; i++ {
		d = math.Min(cfg.MaxMs, float64(d*cfg.Factor))
	}
	switch cfg.Jitter {
	case "full":
		return int64(math.Floor(float64(d * rand))), nil
	case "equal":
		half := d / 2
		return int64(math.Floor(half + float64(half*rand))), nil
	}
	return int64(math.Floor(d)), nil
}

// Candidate is one target for Rank. Ewma is nil when there are no samples yet.
type Candidate struct {
	ID      string   `json:"id"`
	Ewma    *float64 `json:"ewma"`
	Healthy bool     `json:"healthy"`
}

// Rank orders candidates (healthy first, then unmeasured, then ascending EWMA, then original order)
// and returns at most n ids.
func Rank(cands []Candidate, n int) ([]string, error) {
	if n < 0 {
		return nil, ErrRange
	}
	idx := make([]int, len(cands))
	for i := range idx {
		idx[i] = i
	}
	sort.SliceStable(idx, func(x, y int) bool {
		a, b := cands[idx[x]], cands[idx[y]]
		if a.Healthy != b.Healthy {
			return a.Healthy
		}
		au, bu := a.Ewma == nil, b.Ewma == nil
		if au != bu {
			return au
		}
		if !au && *a.Ewma != *b.Ewma {
			return *a.Ewma < *b.Ewma
		}
		return idx[x] < idx[y]
	})
	out := []string{}
	for i := 0; i < len(idx) && i < n; i++ {
		out = append(out, cands[idx[i]].ID)
	}
	return out, nil
}
