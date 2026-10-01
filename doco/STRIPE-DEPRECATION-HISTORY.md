Your instinct that "two huge projects stopped integrating" is understandable, but the reality is a bit different and, frankly, less dramatic in one way and more damning in another. There are actually **two separate failures stacking on top of each other**, and neither is Stripe and Firebase having a falling-out.

## First correction: Stripe never really maintained the integration

The `firestore-stripe-payments` extension was never a jointly-owned core product. It was a third-party package that Stripe published on Firebase's Extensions marketplace. Firebase owned the platform; Stripe owned the extension. In April 2023 a maintainer opened the bluntly titled issue ["Is this library actually maintained?"](https://github.com/stripe/stripe-firebase-extensions/issues/524), and a Stripe support rep confirmed in writing that the extensions were "largely unmaintained at this point and their future, and our support offering around them, is currently uncertain," recommending people just "roll your own Stripe + Firebase integration."

By August 2023 Stripe transferred the extension to Invertase, a Firebase-aligned agency. That transfer was handled so poorly that it produced a widely shared Hacker News thread titled ["Google just killed the Firebase stripe extension – zero warning"](https://news.ycombinator.com/item?id=37141273), with developers finding production billing flows disrupted and no clear migration path. Invertase kept it alive for a while, then in **June 2026 posted a status update saying the repository is "not actively maintained" and will receive no further updates, bug fixes, or support**. So the Stripe integration was effectively abandoned in stages before Google ever touched the platform: Stripe → Invertase → nobody.

## Second failure: Google is retiring the whole Extensions platform

This is the part in your email. Google's [deprecation FAQ](https://firebase.google.com/docs/extensions/faq-and-troubleshooting) gives the stated reason: "Due to upcoming changes and deprecations within our underlying Google Cloud infrastructure, we will be sunsetting the managed Firebase Extensions service." The shutdown is 31 March 2027, with migration tooling promised from September 2026.

The deeper explanation is visible in the numbers and in Firebase's strategy. An extension is not magic; it is, as one analysis put it, "a Cloud Function with a config screen on top." Analyst coverage like [this piece](https://firerun.io/firebase-extensions-deprecated-2026/) notes Extensions is Firebase's *third* product wind-down within about a year, alongside Firebase Studio (AI IDE) and Firebase ML, and reads it as Google "clearing lower-usage surfaces ahead of its Gemini-centric roadmap." Breakdowns of install counts showed the market was heavily concentrated in Google's own extensions (BigQuery, email, image resize), with third-party ones like Stripe's far smaller relative to the maintenance overhead. Google had also already paused accepting new extension publishers. So the managed layer cost more to run than it returned, and Google decided the code should just live in developers' own Cloud Functions directories.

## Are thousands of developers horrified? Yes, and there is ample evidence

The Stripe extension alone shows 16,900+ installs, and the most popular extensions reach 100K+. The Reddit and Hacker News threads are full of developers saying extensions were the whole reason they chose Firebase, and that they now face rebuilds. The 2023 doxxing-style outage was genuinely damaging because billing broke without warning. So your sympathy is well placed; this was a real, disruptive event for a lot of small teams and indie developers.

## Why both companies behaved this way

Stripe's calculus: the extension was a customer-acquisition convenience, not a revenue-generating product. It created support burden and bad will when it broke, so the cheapest rational exit was to hand it to a third party and point people at "build it yourself." Google's calculus: the Extensions management layer was a low-usage, high-maintenance surface sitting on top of ordinary Cloud Functions, at odds with its AI/agent-first direction. Neither company needed a specific excuse to *stop integrating*; they each decided maintaining the convenience wrapper was not worth it. The integration capability itself is untouched — you can still call Stripe from Firebase Cloud Functions exactly as before. What dies is the packaged, managed convenience.

## What this means for onekeyjam specifically

Because you are not actually charging anyone, you are in the lucky group. The prior plan is unchanged and remains valid: uninstall the extension before the deadline (which also avoids the manual Google Cloud cleanup later), and delete the dead subscription code. If you ever do want subscriptions, the "roll your own Cloud Function calling Stripe" approach that Stripe support recommended back in 2023 is now the officially endorsed path anyway.

## Summary

Stripe and Firebase did not stop integrating out of any dispute. Stripe quietly stopped maintaining its extension and handed it to Invertase in 2023, Invertase stopped maintaining it in 2026, and separately Google is retiring the entire Extensions platform by March 2027 to reduce maintenance and focus on AI. Developers were genuinely hurt, especially in 2023 when billing broke without warning, but the underlying capability is intact because an extension is just Cloud Functions. For onekeyjam, the earlier removal plan is still the right and cheap path, and it sidesteps the whole mess.



# My Pushback

> You'd think a billion dollar company like stripe would want to encourage a huge platform like firebase to use stripe and make it easy. i don't buy the 'too hard to maintain or support' argument. they have many developers and it would only take one developer a few hours a week to maintain an easy library. its not rocket science.

## Response

You're making a fair point, and I want to concede part of it before pushing back on another part. The code itself really was small. People who tore it apart said so on GitHub: "there isn't much to it. Everything that does work could easily be extracted and hosted as a regular Firebase function webhook." It is six Cloud Functions. Your instinct that this is "not rocket science" is correct. So my earlier "too hard to maintain" framing was weak and I'll drop it. The real reasons are less about difficulty and more about incentives, ownership, and risk.

## "A few hours a week of coding" is true, but coding was never the cost

The expensive parts of owning this thing were not writing the code:

- **Tail risk, not average time.** This code touches payments and Firebase Auth custom claims. A bug doesn't just fail a test; it either breaks someone's billing or grants paid access to a freeloader. For Stripe, whose entire brand is "payments you can trust," that is a liability with a very fat tail. You staff for the worst case, not the median case.
- **Runtime and SDK churn you don't control.** The extension had to chase Node 14 → 18 → 20 because Google deprecates runtimes, and it got broken by Firebase SDK v8 → v9 changes. The GitHub issue shows it literally broke Firestore in projects just by being installed. None of that is Stripe's roadmap; it's someone else's.
- **Support is distributed and un-reproducible.** Every user runs it in their own project, with their own Stripe keys, webhook secret, region, Firestore layout and Firebase version. Stripe support cannot reproduce these setups, which is why the issue thread is years of unanswered frustration. That support load falls on people who could be helping revenue customers.

That is a part-time-to-full-time role plus on-call, not a few hours, and it is mostly support and maintenance triage rather than writing features.

## The decisive factor: it was becoming a net-negative acquisition channel

The extension only existed as a customer-acquisition convenience. But a rotting acquisition tool doesn't just stop helping; it actively repels. One commenter put it well: the extension was "losing Stripe customers," because anyone who installed it was already sold on Stripe and then got a bad experience. So the rational calculation isn't "we can afford an engineer to keep this nice thing alive." It's "this asset has flipped from positive to negative, and the cheapest exit is to hand it to a third party." That's exactly what happened: "We've worked with the Firebase team to identify a new owner, Invertase."

## Why a big company still can't just assign one person

This is the part people underestimate. In a large company, the question is never "could one engineer do this?" It's "is this the best use of that engineer relative to everything else?" A convenience integration for a third-party platform almost never wins that prioritization against revenue-critical work. And critically, **it was nobody's job**. There was no owner whose performance depended on it, which is why it rotted for years while Stripe's own support was telling people "roll your own." This is the classic pattern of corporate open source dying from neglect, not from impossibility. Capability wasn't the constraint; ownership and prioritization were.

## There's also a strategic/control argument, which just got proven

Stripe owns the code, but Google owns the platform, the runtime, the deployment, and the relationship. Stripe was a tenant maintaining a payments integration on someone else's land with no lease. And that risk just materialized in the most dramatic way possible: Google is killing the whole Extensions platform. So even if Stripe had staffed it generously, the ground was going to disappear anyway.

Stripe's actual strategy is API-first: ship excellent SDKs and let developers compose. The extension was always a departure from that. Note that Firebase's own current guidance is now "customize and deploy your own version of our open-source Cloud Functions + Stripe sample," and Stripe's docs push webhooks plus the official libraries. Both companies have quietly converged on "you own the glue," which is the opposite of the extension model.

## Where your frustration is still justified

I think you're right that this was, in the long run, a strategic mistake. A well-maintained integration is a moat and a durable acquisition funnel, and Stripe let the community sour over years while still promoting the thing. That cost them real goodwill and probably real customers. The failure was organizational shortsightedness, not technical impossibility. So "one dev could have done it" and "this was a bad decision" can both be true: it was affordable, and they still neglected it, because nobody owned it and it wasn't on anyone's bonus.

## Summary

The code was easy and your "not rocket science" instinct is correct, so I withdraw the difficulty argument. The real reasons were that the extension carried fat-tailed payments/security risk, generated un-reproducible support load, had no controlling owner inside Stripe, was turning into a negative acquisition channel, and sat on a platform Google was destined to retire anyway. The decision reflects incentives and ownership, not a lack of engineers. You're also right that it was arguably a strategic blunder, because the goodwill cost was real.

This doesn't change anything for onekeyjam: the removal plan stands and remains the cheap, correct path. Want me to proceed with it, or would you like to keep digging into the history first?
