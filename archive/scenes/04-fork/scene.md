---
title: The Fork
type: content
---

# You've built a blog.

```php
class Post {
    id
    title
    body
    author_id
    created_at
}
```

!muted A post is public the moment it exists. `Post::all()` gives you the blog.

---

<div style="max-width: 640px; margin: 2rem auto; padding: 1.5rem 2rem; background: {{bgDark}}; border-left: 3px solid {{accent}}; border-radius: 6px;">
  <div style="color: {{textMuted}}; font-size: 0.85rem; margin-bottom: 0.75rem;">from: product@company.com</div>
  <div style="font-size: 1.3rem; line-height: 1.5;">Hey — can authors save drafts before publishing? Thanks!</div>
</div>

!muted Totally reasonable. Should be easy, right?

---

# Two honest paths.

<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 2rem; margin-top: 2rem;">
  <div>
    <div style="color: {{accent}}; font-weight: 600; margin-bottom: 0.75rem;">Path A — Reshape</div>
    <pre style="background: {{bgDark}}; padding: 1rem; border-radius: 4px; font-size: 0.85rem; overflow: auto;">enum PublicationStatus {
  DRAFT, PUBLISHED
}

class Post {
  ...
  status: PublicationStatus
}

// every public-post query now asks:
// "what should the public see?"</pre>
  </div>
  <div>
    <div style="color: {{accentWarm}}; font-weight: 600; margin-bottom: 0.75rem;">Path B — Shortcut</div>
    <pre style="background: {{bgDark}}; padding: 1rem; border-radius: 4px; font-size: 0.85rem; overflow: auto;">Schema::table('posts', fn ($t) =&gt;
  $t-&gt;boolean('published')
    -&gt;default(true)
);</pre>
  </div>
</div>

---

# Path A is honest. And expensive.

<div style="font-family: ui-monospace, monospace; font-size: 1rem; line-height: 1.9; background: {{bgDark}}; padding: 1.5rem 2rem; border-radius: 6px; max-width: 720px; margin: 1.5rem auto;">
<span style="color: {{textMuted}};">Files that currently show posts to the public:</span><br><br>
  PostController@index<span style="color: {{textMuted}};"> — blog listing</span><br>
  RssController@feed<span style="color: {{textMuted}};"> — RSS output</span><br>
  SitemapController@build<span style="color: {{textMuted}};"> — sitemap.xml</span><br>
  SearchIndexer<span style="color: {{textMuted}};"> — search indexing job</span><br>
  WeeklyDigestJob<span style="color: {{textMuted}};"> — email digest</span><br>
  RelatedPostsWidget<span style="color: {{textMuted}};"> — widget on every page</span><br>
</div>

!muted Path A coordinates all six today, as one refactor. The PM asked for drafts. Not a refactor. Demo's Friday.

---

# Path B ships.

```php
// migration
$table->boolean('published')->default(true);

// PostController@index
return Post::where('published', true)->get();
```

!muted 10 minutes. One line. Authors can save drafts. You're a hero.

---

# Now: scheduled posts.

<div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 1rem; margin-top: 1.5rem; font-size: 0.75rem;">
  <div style="background: {{bgDark}}; padding: 0.75rem; border-radius: 4px;">
    <div style="color: {{accent}}; margin-bottom: 0.5rem;">PostController@index</div>
    <pre style="margin: 0;">Post::where('published', true)
  -&gt;orWhere('publish_at',
    '&lt;=', now())
  -&gt;get();</pre>
  </div>
  <div style="background: {{bgDark}}; padding: 0.75rem; border-radius: 4px;">
    <div style="color: {{accent}}; margin-bottom: 0.5rem;">RssController@feed</div>
    <pre style="margin: 0;">Post::where('published', true)
  -&gt;orWhere('publish_at',
    '&lt;=', now())
  -&gt;get();</pre>
  </div>
  <div style="background: {{bgDark}}; padding: 0.75rem; border-radius: 4px;">
    <div style="color: {{accent}}; margin-bottom: 0.5rem;">SitemapController@build</div>
    <pre style="margin: 0;">Post::where('published', true)
  -&gt;orWhere('publish_at',
    '&lt;=', now())
  -&gt;get();</pre>
  </div>
  <div style="background: {{bgDark}}; padding: 0.75rem; border-radius: 4px;">
    <div style="color: {{accent}}; margin-bottom: 0.5rem;">SearchIndexer</div>
    <pre style="margin: 0;">Post::where('published', true)
  -&gt;orWhere('publish_at',
    '&lt;=', now())
  -&gt;get();</pre>
  </div>
  <div style="background: {{bgDark}}; padding: 0.75rem; border-radius: 4px;">
    <div style="color: {{accent}}; margin-bottom: 0.5rem;">WeeklyDigestJob</div>
    <pre style="margin: 0;">Post::where('published', true)
  -&gt;orWhere('publish_at',
    '&lt;=', now())
  -&gt;get();</pre>
  </div>
  <div style="background: {{bgDark}}; padding: 0.75rem; border-radius: 4px;">
    <div style="color: {{accent}}; margin-bottom: 0.5rem;">RelatedPostsWidget</div>
    <pre style="margin: 0;">Post::where('published', true)
  -&gt;orWhere('publish_at',
    '&lt;=', now())
  -&gt;get();</pre>
  </div>
</div>

!muted One change. Six places. Someone will forget one of these.

---

# Now: private posts.

<div style="background: {{bgDark}}; padding: 1rem 1.5rem; border-radius: 4px; max-width: 720px; margin: 1rem auto; font-size: 0.8rem;">
<div style="color: {{textMuted}}; margin-bottom: 0.5rem;">The SAME block, in six files:</div>
<pre style="margin: 0;">Post::where(function ($q) {
    $q-&gt;where('published', true)
      -&gt;orWhere('publish_at', '&lt;=', now());
})
-&gt;where(function ($q) use ($user) {
    $q-&gt;where('visibility', 'public')
      -&gt;orWhere(function ($q) use ($user) {
          $q-&gt;where('visibility', 'members')
            -&gt;where('user_is_member', true);
      });
})
-&gt;get();</pre>
</div>

!muted Three features in. Six files still have to agree. Bugs live where file six doesn't match files one through five.

!muted You shipped the first version in 10 minutes. The cost didn't vanish. It moved here.
