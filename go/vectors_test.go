package lombokresilience

import (
	"encoding/json"
	"os"
	"reflect"
	"testing"
)

type vectors struct {
	CaseCount int `json:"caseCount"`
	Ewma      []struct {
		Alpha  float64 `json:"alpha"`
		Values []struct {
			Sample float64 `json:"sample"`
			Value  float64 `json:"value"`
		} `json:"values"`
	} `json:"ewma"`
	Breaker []struct {
		Cfg   BreakerConfig `json:"cfg"`
		Steps []struct {
			Op      string `json:"op"`
			T       int64  `json:"t"`
			Allowed *bool  `json:"allowed"`
			State   string `json:"state"`
		} `json:"steps"`
	} `json:"breaker"`
	Backoff []struct {
		Cfg     BackoffConfig `json:"cfg"`
		Attempt int           `json:"attempt"`
		Rand    float64       `json:"rand"`
		Delay   int64         `json:"delay"`
	} `json:"backoff"`
	Rank []struct {
		Cands []Candidate `json:"cands"`
		N     int         `json:"n"`
		Out   []string    `json:"out"`
	} `json:"rank"`
}

func load(t *testing.T) vectors {
	b, err := os.ReadFile("../vectors/lombokresilience-vectors-v1.json")
	if err != nil {
		t.Fatal(err)
	}
	var v vectors
	if err := json.Unmarshal(b, &v); err != nil {
		t.Fatal(err)
	}
	if v.CaseCount < 100 {
		t.Fatal("fewer than 100 vector cases")
	}
	return v
}

func TestEwma(t *testing.T) {
	for _, s := range load(t).Ewma {
		e, _ := NewEwma(s.Alpha)
		for _, x := range s.Values {
			got, err := e.Update(x.Sample)
			if err != nil || got != x.Value {
				t.Errorf("alpha %v sample %v: got %v want %v", s.Alpha, x.Sample, got, x.Value)
			}
		}
	}
}

func TestBreaker(t *testing.T) {
	for _, s := range load(t).Breaker {
		b, err := NewBreaker(s.Cfg)
		if err != nil {
			t.Fatal(err)
		}
		for _, st := range s.Steps {
			var allowed *bool
			switch st.Op {
			case "allow":
				a := b.Allow(st.T)
				allowed = &a
			case "success":
				b.OnSuccess(st.T)
			default:
				b.OnFailure(st.T)
			}
			if !reflect.DeepEqual(allowed, st.Allowed) || b.State() != st.State {
				t.Errorf("step %+v: allowed %v state %s", st, allowed, b.State())
			}
		}
	}
}

func TestBackoff(t *testing.T) {
	for _, c := range load(t).Backoff {
		got, err := BackoffDelay(c.Attempt, c.Cfg, c.Rand)
		if err != nil || got != c.Delay {
			t.Errorf("%+v: got %d err %v", c, got, err)
		}
	}
}

func TestRank(t *testing.T) {
	for _, c := range load(t).Rank {
		got, err := Rank(c.Cands, c.N)
		if err != nil || !reflect.DeepEqual(got, c.Out) {
			t.Errorf("%+v: got %v", c, got)
		}
	}
}

func TestInvalid(t *testing.T) {
	if _, err := NewEwma(0); err == nil {
		t.Error("alpha 0 must fail")
	}
	e, _ := NewEwma(0.5)
	if _, err := e.Update(-1); err == nil {
		t.Error("negative sample must fail")
	}
	if _, err := BackoffDelay(0, BackoffConfig{1, 2, 10, "full"}, 1); err == nil {
		t.Error("rand = 1 must fail")
	}
	if _, err := NewBreaker(BreakerConfig{0, 0, 1}); err == nil {
		t.Error("threshold 0 must fail")
	}
}
