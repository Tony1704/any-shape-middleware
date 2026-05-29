# express-demo

Runnable demo of `any-shape`. The demo lives in this repo and depends on the parent package via `file:../..`, so it always builds against the local source.

## Run

From the repo root, build the library first:

```sh
npm install
npm run build
```

Then in `examples/express-demo`:

```sh
npm install
echo "OPENAI_API_KEY=sk-..." > .env
npm run dev
```

## Try it

```sh
# fast path — payload already valid
curl -sX POST http://localhost:3000/user -H 'content-type: application/json' \
  -d '{"id":"u1","name":"Ada","age":36,"email":"ada@example.com"}'

# slow path — renamed fields, the LLM reshapes
curl -sX POST http://localhost:3000/user -H 'content-type: application/json' \
  -d '{"userId":"u1","fullName":"Ada Lovelace","yearsOld":36,"emailAddress":"ada@example.com"}'

# 422 — required fields missing
curl -sX POST http://localhost:3000/user -H 'content-type: application/json' \
  -d '{"name":"Ada","age":36}'
```
