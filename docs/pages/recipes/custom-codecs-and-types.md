# Custom Codecs and Types

When working with Polkadot the SCALE codec is used everywhere. Every now and then there is the need to create custom data structures which need to be encoded into SCALE bytes. Common places are signing a custom structured message or given structure to a arbitrary payload.

This code snippet shows how to use the `@polkadot-api/substrate-bindings` package to create more complex data structures from the primitive types it provides.

```ts
import {
  Bin,
  Binary,
  Hex,
  str,
  Struct,
  u8,
  Variant,
  Vector,
} from "@polkadot-api/substrate-bindings"

const hex32 = Hex(32)

const ConnectedCodec = Struct({
  sessionId: str,
  publicKey: hex32,
})

const RequestCodec = Struct({
  requestId: str,
  data: Bin(),
})

const ResponseCodec = Struct({
  requestId: str,
  code: u8,
})

const MessageCodec = Variant({
  connected: ConnectedCodec,
  request: RequestCodec,
  response: ResponseCodec,
})

const MessagesCodec = Vector(MessageCodec)

type Message = ReturnType<typeof MessageCodec.dec>
const messages: Message[] = [
  {
    type: "connected",
    value: {
      sessionId: "my-session-id",
      publicKey: "0x1234567890123456789012345678901234567890",
    },
  },
  {
    type: "request",
    value: {
      requestId: "request-01",
      data: Binary.fromBytes(new Uint8Array([0xca, 0xfe])),
    },
  },
  {
    type: "response",
    value: {
      requestId: "request-01",
      code: 0,
    },
  },
]

const scaleEncodedMessages = MessagesCodec.enc(messages)
```
