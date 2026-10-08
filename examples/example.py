import pathlib, sys
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parents[1] / "python" / "src"))
from lombokresilience import Breaker, BreakerConfig, Ewma, backoff_delay, rank

e = Ewma(0.2)
for x in (40, 42, 400):
    e.update(x)
print("ewma", e.value)
print("rank", rank([("a", 30, True), ("b", None, True), ("c", 10, False)], 3))
b = Breaker(BreakerConfig(2, 1000, 1))
b.on_failure(0); b.on_failure(1)
print(b.state, b.allow(500), b.allow(1001), b.state)
print("backoff", [backoff_delay(n, 100, 2, 500) for n in range(4)])
