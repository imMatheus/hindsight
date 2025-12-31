# GitBack

See the stats of any repo, over time

## Server cahcing

All json payloads are cached in gcp for 24h. We do a couple of things that reduce the size, for e.g

1. All commits keys are minified, so `auther` -> `a` for example
2. COmmit messages are shortened to first 100 letters
