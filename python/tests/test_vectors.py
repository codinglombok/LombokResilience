import json
import pathlib
import sys

import pytest

sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "src"))
from lombokresilience import Breaker, BreakerConfig, Ewma, backoff_delay, rank  # noqa: E402

V = json.loads((pathlib.Path(__file__).resolve().parents[2] / "vectors" / "lombokresilience-vectors-v1.json").read_text("utf-8"))


def test_count():
    assert V["caseCount"] >= 100


def test_ewma():
    for s in V["ewma"]:
        e = Ewma(s["alpha"])
        for x in s["values"]:
            assert e.update(x["sample"]) == x["value"]


def test_breaker():
    for s in V["breaker"]:
        c = s["cfg"]
        b = Breaker(BreakerConfig(c["failureThreshold"], c["cooldownMs"], c["halfOpenProbes"]))
        for st in s["steps"]:
            allowed = None
            if st["op"] == "allow":
                allowed = b.allow(st["t"])
            elif st["op"] == "success":
                b.on_success(st["t"])
            else:
                b.on_failure(st["t"])
            assert allowed == st["allowed"] and b.state == st["state"], st


def test_backoff():
    for c in V["backoff"]:
        g = c["cfg"]
        assert backoff_delay(c["attempt"], g["baseMs"], g["factor"], g["maxMs"], g["jitter"], c["rand"]) == c["delay"], c


def test_rank():
    for c in V["rank"]:
        cands = [(x["id"], x["ewma"], x["healthy"]) for x in c["cands"]]
        assert rank(cands, c["n"]) == c["out"]


def test_invalid():
    with pytest.raises(ValueError):
        Ewma(0)
    with pytest.raises(ValueError):
        Ewma(0.5).update(-1)
    with pytest.raises(ValueError):
        backoff_delay(0, 1, 2, 10, "full", 1.0)
    with pytest.raises(ValueError):
        Breaker(BreakerConfig(0, 0, 1))
