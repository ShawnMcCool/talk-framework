# Systems Design Talk

## Outline

- intro
  - who i am
  - what is the point of this talk?
  - what is the point of a systems design interview?

- what the interviewer needs
  - knowledge
  - trade-off analysis
  - product focus
  - can you build a system based on the business' knowledge, instead of your own ignorance

- requirements collection
  - functional and nonfunctional
  - user journey
  - understanding the environment

- the design challenge

- other
  - service boundaries
  - idempotency
  - race conditions

- extra content
  - back-off / dead-lettering





## Design Challenge: e-commerce order service

- functional requirements
  - place an order
  - cancel an order
  - view order history

- non-functional requirements
  - do not sell items we don't have

- environment
  - internal company inventory system


