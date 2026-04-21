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

- cheat sheet
  - what is the user journey? step by step
  - what is the environment we're in?
    - technology choices
    - preferred practices / approaches
    - in-house skills


- framework
  - user journey
  - understand the environment
  - select components
  - specify schemas
  - consider constraints
  - refine failure model
    - crashes
    - retries
    - concurrency
  - walk through flows



## Design Challenge: e-commerce order service

- functional requirements
  - place an order
  - cancel an order
  - view order history

- non-functional requirements
  - do not sell items we don't have

- environment
  - internal company inventory system


