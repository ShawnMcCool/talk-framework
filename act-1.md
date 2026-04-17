# Act 1 — The Cycle of Shame

A slide-by-slide design artifact for Act 1 of the talk. Each slide lists its **beat**, **visual**, **pseudocode** (when relevant), and **talking points** — the anchors a live orator works from. This is not a full script.

## Delivery notes

- **Audience**: Laravel-fluent technical-college students approaching the job market. Many are self-taught. They have built the Laravel blog tutorial. They have not worked in a legacy codebase for three years.
- **Tone**: fun, fast, provocative, hopeful. Act 1 describes pain, but the delivery should never wallow.
- **Territory visual (Part A main content)**: a growing node-and-edge graph representing a codebase. Nodes = features/entities. Edges = things that depend on each other. The same graph evolves across slides 2–7. This is the *territory* — what the codebase looks like right now.
- **Map visual (persistent from slide 2 onward)**: a horizontal timeline along the bottom of every slide starting at slide 2. Five dots, labeled left-to-right: **Excited → Shipping → Friction → Breakage → Rewrite**. One dot lights per slide across 2–6. The line is *straight* through slide 6 — it does not yet imply a loop. On slide 7, the line **curls around** and its right end connects back to its left end, forming a loop. That curl is the reveal. After slide 7, the loop persists as a small element in a corner of every remaining slide in Act 1, as the organizing schema students can orient to.
- **Do not telegraph the loop.** Slides 2–6 must visually read as linear progression. The circle shape must not exist on screen until slide 7.
- **Through-line example (Part C)**: a blog with a `Post` model. Same codebase evolves across slides 11–17.
- **Pacing target**: ~8–10 minutes for all of Act 1 (18 slides, average ~30 sec each, some faster, Slide 7 deliberately slow).
- **What we're setting up**: Act 2 names **coupling** and **accidental complexity**. Act 1 must *show* both before Act 2 names them. Do not name them in Act 1.

---

## Part A — The Cycle (slides 1–7)

Two visuals run simultaneously:
- **Center**: the evolving coupling graph (territory) — what the code looks like right now.
- **Bottom strip**: the five-dot timeline (map) — where we are in the story. Straight line through slide 6, curls into a loop at slide 7.

The territory shows decay. The map shows progression. They do different jobs.

### Slide 1 — Hook

**Beat**: provoke the conventional wisdom.

**Visual**: full-screen text, no graph yet.

> "Learn the popular tech and you'll get hired."

Maybe a grid of tech logos (Laravel, React, Python, Node, Rust, Go) behind the text, slightly faded.

**Talking points**:
- Everyone tells you this. Your teachers. Job boards. Reddit.
- Is it true? Kind of. It's table stakes.
- But starting somewhere isn't the same as ending up there.
- Today I want to give you a counter-point you can actually use.

---

### Slide 2 — Day 1

**Beat**: establish pure optimism. This is the baseline.

**Visual**:
- *Center:* a clean, small graph. 3 nodes (`User`, `Post`, `Comment`), 2 edges. Lots of empty space around it. Everything feels airy.
- *Bottom strip:* the timeline appears for the first time. Five dots on a straight horizontal line, labeled **Excited · Shipping · Friction · Breakage · Rewrite**. Only the first dot (**Excited**) is lit.

**Talking points**:
- You just got the project. It's new. It's yours.
- You've learned so much to get here. You're ready.
- You're going to make a big impact on the business.
- Notice how this feels.

---

### Slide 3 — Shipping

**Beat**: the honeymoon. Flow state.

**Visual**:
- *Center:* same graph, grown to ~7 nodes. Still clean. Nicely arranged. Edges are sparse and intentional.
- *Bottom strip:* the second dot (**Shipping**) lights. Line still straight.

**Talking points**:
- Features go out fast.
- Product trusts you. You trust yourself.
- Early assumptions turn out wrong — you fix them, you reshape, no big deal.
- This is what healthy change feels like.

---

### Slide 4 — Friction

**Beat**: first tightness in the chest.

**Visual**:
- *Center:* same graph, now ~12 nodes. Edges are starting to multiply. The layout is busier; things cross.
- *Bottom strip:* the third dot (**Friction**) lights. Line still straight.

**Talking points**:
- The system has a lot in it now.
- You used to change the *shape* of things. Now you're careful.
- A change to one feature might affect three others.
- You start writing code you're not proud of — just to avoid touching the rest.

---

### Slide 5 — Breakage

**Beat**: things hurt.

**Visual**:
- *Center:* same graph, now dense and tangled. Some edges pulse red. A small red incident icon floats over one node.
- *Bottom strip:* the fourth dot (**Breakage**) lights. Line still straight.

**Talking points**:
- Deploys cause incidents. Nobody's sure why.
- Your manager is frustrated. Why are you so slow?
- You're frustrated. You feel like you're shipping lemons.
- This is not what competence was supposed to feel like.

---

### Slide 6 — The Rewrite

**Beat**: the ask. The reset.

**Visual**:
- *Center:* the tangled graph from slide 5 with a big red **START OVER** stamp across it. Or: the graph dissolving into fragments.
- *Bottom strip:* the fifth dot (**Rewrite**) lights. All five dots are now lit. **The line is still straight.** The end of the line points to empty space — the audience should feel "what comes after Rewrite?" but the answer is not yet visible.

**Talking points**:
- You ask for a rewrite. So do your colleagues.
- Management pushes back — rewrites are expensive, delay features.
- You push. You push. Eventually they agree. Budget approved.
- You're going to build something new.

---

### Slide 7 — Day 1 (again)

**Beat**: the punch. The loop closes. **Two simultaneous reveals.**

**Visual**:
- *Center:* the coupling graph **snaps back** to exactly the slide-2 state. 3 nodes. 2 edges. Clean. Airy. Identical in every detail to slide 2's center visual.
- *Bottom strip:* the timeline **curls**. The right end of the line (after the **Rewrite** dot) animates in a smooth arc around to reconnect at the left end (**Excited**). What was a line is now a loop. The **Excited** dot pulses once as the arrow arrives.
- No words on screen.

These two changes happen together. The graph reset and the timeline curl are the same beat.

**Talking points**:
- *(silence, 5 seconds while the curl completes)*
- Does this look familiar?
- I've lived through this at five companies. I've watched consulting clients live through it. It is not rare.
- This is the cycle. The question is: **why does it happen every single time?**

---

## Part B — Two Experiences (slides 8–10)

Stop the coupling graph. Text-only slides. Same layout template across slides 8 and 9 — the *sameness* of the template is the point.

**Persistent element**: the revealed loop from slide 7 shrinks to a small element in a corner (top-right recommended) and stays there for every slide 8–18. Its five dots are all lit. No dot is currently highlighted. It's a quiet reminder: whatever we're looking at now is happening *inside this loop*.

### Slide 8 — The Engineer

**Beat**: empathy for the engineer seat.

**Visual**: centered monologue, large type, speaker icon (hard hat / hoodie / laptop — whatever reads "engineer").

> "I know so much. I work so hard. I'm trying to do a good job.
>
> So why am I being blamed for code I inherited?
> Why doesn't anyone trust me to fix it?"

**Talking points**:
- You feel the loss of autonomy.
- Production errors feel personal even when they're not.
- You know you could fix it if they'd give you the time.

---

### Slide 9 — The Manager

**Beat**: empathy for the manager seat. Same template — different voice.

**Visual**: identical layout to slide 8, different icon (clipboard / calendar / suit).

> "Why are they so slow lately?
>
> Why do they keep asking to fix *technical* things instead of shipping *product* things?
> I have business objectives. I report to someone too."

**Talking points**:
- The slowness is real. They're not imagining it.
- They're under pressure from above.
- Micromanagement feels like the only lever they have.

---

### Slide 10 — The Dynamic

**Beat**: name the feedback loop. This is not a bad-people problem.

**Visual**: two portraits side by side, with arrows forming a loop between them:
- engineer → less autonomy
- less autonomy → less ownership
- less ownership → fewer results
- fewer results → more micromanagement
- more micromanagement → back to engineer

**Talking points**:
- Nobody in this picture is acting in bad faith.
- The dynamic is structural. It's downstream of something else.
- That something else is what we're about to look at.

---

## Part C — The Fork (slides 11–17)

Switch to the concrete example. Laravel blog. Same codebase evolves across these 7 slides.

**Corner loop (persistent)**: the small loop stays in the corner, but now the **Friction** dot is highlighted on every slide in Part C. This is the structural claim Part C is making: *the Fork happens during the Friction phase*. Shortcuts accumulate there. By the end of Part C the audience has watched what actually occurs inside that one dot on the loop.

### Slide 11 — Setup

**Beat**: establish the starting system.

**Visual**: a simple model diagram — a `Post` card with its fields.

**Pseudocode**:

```php
class Post {
    id
    title
    body
    author_id
    created_at
}

// A post is public the moment it exists.
// Post::all() gives you the blog.
```

**Talking points**:
- You built this. It's the Laravel tutorial. You nailed it.
- Every post in the database is a post on the blog. Simple.
- Nothing to worry about.

---

### Slide 12 — The Feature Request

**Beat**: the innocent trigger.

**Visual**: a Slack/email bubble.

> "Hey — can authors save drafts before publishing? Thanks!"

**Talking points**:
- Totally reasonable.
- Sounds easy, right?
- How would you build it?

---

### Slide 13 — The Fork

**Beat**: the mechanism. Two honest options.

**Visual**: a decision diamond with two arrows branching to labeled paths. Code for both paths side-by-side under the diamond.

**Pseudocode — Path A (reshape)**:

```php
// Publication becomes a first-class concept.
enum PublicationStatus {
    DRAFT, PUBLISHED
}

class Post {
    ...
    status: PublicationStatus
}

// Everywhere that shows posts now asks:
//   "what should be visible to the public?"
```

**Pseudocode — Path B (shortcut)**:

```php
// One boolean on the Post.
Schema::table('posts', fn ($t) =>
    $t->boolean('published')->default(true)
);
```

**Talking points**:
- Both paths work. Both ship drafts.
- Which one would *you* pick?
- Which one do you think gets picked in industry?

---

### Slide 14 — Path A Is Honest (And Expensive)

**Beat**: show why the "right" path is genuinely unaffordable *today*.

**Visual**: the reshape path, with a list of every file in the codebase that currently reads posts — highlighted — showing how many places need coordinated change.

**Pseudocode**:

```
Files that currently show posts to the public:

  PostController@index          — blog listing
  RssController@feed            — RSS output
  SitemapController@build       — sitemap.xml
  SearchIndexer                 — search indexing job
  WeeklyDigestJob               — email digest
  RelatedPostsWidget            — widget on every page

Path A says: all six change together, today,
as one coordinated refactor.
```

**Talking points**:
- Every one of those files says `Post::all()` today.
- Path A is correct. It's also six files and a migration, coordinated.
- The product manager wanted drafts. Not a refactor.
- You have a demo on Friday. You don't have time for six files.

---

### Slide 15 — Path B Ships

**Beat**: the shortcut wins. Cheap. Fast. Heroic.

**Visual**: a green "deployed" banner. A single migration file. A single query change.

**Pseudocode**:

```php
// migration
$table->boolean('published')->default(true);

// PostController@index
return Post::where('published', true)->get();
```

**Talking points**:
- 10 minutes. One migration. One line.
- Authors can save drafts. Product is happy.
- You're a hero. You shipped on time.
- (The other five files? They still say `Post::all()`. We'll get to that.)

---

### Slide 16 — Compounding #1: Scheduled Posts

**Beat**: the next feature arrives. The shortcut spreads.

**Visual**: the six files from slide 14, now displayed as a grid or stack. Each one shows the same growing query. Highlight the duplication.

**Pseudocode**:

```php
// PostController@index
Post::where('published', true)
    ->orWhere('publish_at', '<=', now())
    ->get();

// RssController@feed
Post::where('published', true)
    ->orWhere('publish_at', '<=', now())
    ->get();

// SitemapController@build
Post::where('published', true)
    ->orWhere('publish_at', '<=', now())
    ->get();

// ... same pattern in 3 more files.
```

**Talking points**:
- Product wants scheduled publishing. Same query. Just more of it.
- One change is now six changes.
- Notice how it's the *exact same condition* in every file.
- Someone is going to forget one of these. That someone might be you.

---

### Slide 17 — Compounding #2: Private Posts

**Beat**: the condition becomes a monster. The landscape.

**Visual**: same six files, same grid. The condition has grown. Nested. Branching. Ugly.

**Pseudocode**:

```php
// The SAME block, in six files:

Post::where(function ($q) {
    $q->where('published', true)
      ->orWhere('publish_at', '<=', now());
})
->where(function ($q) use ($user) {
    $q->where('visibility', 'public')
      ->orWhere(function ($q) use ($user) {
          $q->where('visibility', 'members')
            ->where('user_is_member', true);
      });
})
->get();
```

**Talking points**:
- Three features in. The condition is now nested.
- Six files still have to agree.
- This is where bugs live: file six doesn't match files one through five.
- Remember — you shipped the first version of this in 10 minutes.
- The cost didn't vanish. It moved to *here*.

---

## Part D — Bridge to Act 2 (slide 18)

### Slide 18 — These Have Names

**Beat**: tease the diagnosis. Make them want Act 2. Do not explain.

**Visual**: clean title-card style. Two phrases stacked.

> Two things just happened.
>
> They have names.

Optionally, under each phrase, a subtle hint — but no jargon yet:
- "Six files all had to know the same secret."
- "A condition grew out of a shortcut, not a requirement."

**Corner loop:** the small loop is now centered and enlarged on this slide — not in the corner anymore. A soft **?** hovers over the middle of the loop. The implicit question: *why does this loop exist?* Act 2 answers it.

**Talking points**:
- *(don't name them yet — let the silence build)*
- The first thing has a name. You'll learn it in a minute.
- The second thing has a name too.
- Once you see both, you can't un-see them.
- And once you can see them, you can pick tools that don't make them inevitable.

---

## Verification checklist

- [ ] Slide 7's **center graph** is identical to slide 2's center graph (same 3 nodes, same 2 edges, same spatial layout).
- [ ] Slides 2–6 show the timeline as a **straight line**. No curvature, no circular hint, on any of these slides.
- [ ] Slide 7 is the **first** slide on which the line curls. The curl is animated, not pre-drawn.
- [ ] Slides 8 and 9 share a layout template (same position, same type size, only voice and icon differ).
- [ ] Slides 8–17 show the small loop in a consistent corner position.
- [ ] Slides 11–17 show the **Friction** dot highlighted on the corner loop. (Part C is explicitly the Friction phase zoomed in.)
- [ ] Slides 14, 16, 17 all reference the same six files by name, in the same order.
- [ ] Slides 16 and 17 show the *same condition* in multiple files — the duplication must be visually obvious.
- [ ] Slide 13's two pseudocode blocks fit on one slide next to each other without scrolling.
- [ ] Slide 18 does **not** use the words "coupling" or "accidental complexity."
- [ ] Total read-aloud time: 8–10 minutes.
