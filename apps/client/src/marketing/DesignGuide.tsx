import { Link } from 'react-router-dom';
import { ArrowRight, Store, Check, Minus, GripVertical, Palette, Type, LayoutGrid, MousePointerClick } from 'lucide-react';
import type { ReactNode } from 'react';

const BRAND = '#7C3AED';
const IMG = '/design/';

/** A real screenshot from the product, with a caption */
function Shot({ src, alt, caption, className = '' }: { src: string; alt: string; caption?: ReactNode; className?: string }) {
  return (
    <figure className={className}>
      <img src={`${IMG}${src}`} alt={alt} loading="lazy" className="w-full rounded-xl border border-slate-200 shadow-sm" />
      {caption && <figcaption className="mt-2 text-sm text-slate-500">{caption}</figcaption>}
    </figure>
  );
}

function Block({ id, icon, eyebrow, title, intro, children }: { id: string; icon: ReactNode; eyebrow: string; title: string; intro: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 border-t border-slate-100 py-16 px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-widest" style={{ color: BRAND }}>{icon} {eyebrow}</div>
        <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">{title}</h2>
        <p className="mt-3 max-w-2xl text-lg text-slate-500">{intro}</p>
        <div className="mt-10 flex flex-col gap-10">{children}</div>
      </div>
    </section>
  );
}

function Steps({ items }: { items: ReactNode[] }) {
  return (
    <ol className="flex flex-col gap-3">
      {items.map((t, i) => (
        <li key={i} className="flex gap-3 text-[15px] leading-relaxed text-slate-700">
          <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white" style={{ background: BRAND }}>{i + 1}</span>
          <span>{t}</span>
        </li>
      ))}
    </ol>
  );
}

const BACKGROUNDS = [
  { src: 'bg-default.jpg', name: 'Theme', desc: 'The theme\'s own background. This is what every section has until you change it.' },
  { src: 'bg-soft.jpg', name: 'Soft', desc: 'The theme\'s second shade. A gentle step apart from the sections around it.' },
  { src: 'bg-contrast.jpg', name: 'Contrast', desc: 'The opposite of the theme: light on a dark theme, dark on a light one.' },
  { src: 'bg-accent.jpg', name: 'Brand', desc: 'Your brand color. Text and buttons switch between dark and light on their own so they stay readable.' },
  { src: 'bg-photo.jpg', name: 'Photo', desc: 'Your own picture behind the section, under a dark veil with light text.' },
];

const MATRIX: { feature: string; booking: boolean; other: boolean }[] = [
  { feature: 'Your own heading and a short intro for each section', booking: true, other: true },
  { feature: 'Left, center or right text alignment', booking: true, other: true },
  { feature: 'Tight, normal or roomy spacing', booking: true, other: true },
  { feature: 'Hero headline, supporting line, alignment and spacing', booking: true, other: true },
  { feature: 'Your own text, image and button blocks', booking: true, other: true },
  { feature: 'Reordering services, products, team, FAQ and testimonials', booking: true, other: true },
  { feature: 'Section backgrounds: Soft, Contrast and Brand', booking: true, other: false },
  { feature: 'Section background photos', booking: true, other: false },
];

export default function DesignGuide() {
  return (
    <div className="min-h-screen bg-white text-slate-900 antialiased">
      <header className="sticky top-0 z-40 border-b border-slate-100 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg" style={{ background: BRAND }}><Store size={14} className="text-white" /></div>
            <span className="text-base font-bold tracking-tight">Shop Suite Direct</span>
          </Link>
          <nav className="hidden items-center gap-6 text-sm font-medium text-slate-600 md:flex">
            <a href="#sections" className="hover:text-slate-900">Sections</a>
            <a href="#hero" className="hover:text-slate-900">Hero</a>
            <a href="#blocks" className="hover:text-slate-900">Your blocks</a>
            <a href="#reorder" className="hover:text-slate-900">Reordering</a>
            <a href="#themes" className="hover:text-slate-900">Themes</a>
          </nav>
          <Link to="/sign-in" className="text-sm font-medium text-slate-600 transition-colors hover:text-slate-900">Sign in</Link>
        </div>
      </header>

      {/* Hero */}
      <section className="px-6 pb-16 pt-20 text-center" style={{ background: 'linear-gradient(180deg, #f5f3ff 0%, #ffffff 100%)' }}>
        <div className="mx-auto max-w-3xl">
          <div className="mb-8 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-4 py-1.5 text-xs font-semibold text-violet-700">Design options · Pro and Business</div>
          <h1 className="mb-6 text-5xl font-extrabold leading-[1.05] tracking-tight sm:text-6xl">
            Make your site look<br /><span style={{ color: BRAND }}>like yours.</span>
          </h1>
          <p className="mx-auto mb-10 max-w-xl text-lg text-slate-500">
            Pick a theme, then shape every section: your own words, spacing and backgrounds, a hero that says what you want, extra blocks wherever you need them, and everything in the order you choose.
          </p>
          <div className="flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Link to="/sign-up" className="inline-flex items-center gap-2 rounded-xl px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-violet-200 transition-opacity hover:opacity-90" style={{ background: BRAND }}>Start free <ArrowRight size={16} /></Link>
            <Link to="/#pricing" className="inline-flex items-center gap-2 rounded-xl border border-slate-200 px-7 py-3.5 text-sm font-bold text-slate-700 transition-colors hover:bg-slate-50">See plans</Link>
          </div>
        </div>
        <div className="mx-auto mt-14 max-w-5xl">
          <Shot src="builder-design.jpg" alt="The Page Builder with the Services section open, showing heading, alignment, spacing and background choices next to a live preview" caption="The Page Builder: your choices on the left, your real page on the right, updating as you go." />
        </div>
      </section>

      {/* At a glance */}
      <section className="px-6 py-14">
        <div className="mx-auto grid max-w-5xl gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: <LayoutGrid size={18} />, t: 'Design each section', d: 'Heading, intro, alignment, spacing and background.', href: '#sections' },
            { icon: <Type size={18} />, t: 'Your own hero text', d: 'A headline and supporting line that say what you mean.', href: '#hero' },
            { icon: <MousePointerClick size={18} />, t: 'Your own blocks', d: 'Add text, image and button blocks anywhere.', href: '#blocks' },
            { icon: <GripVertical size={18} />, t: 'Drag to reorder', d: 'Services, products, team, FAQ and testimonials.', href: '#reorder' },
          ].map((c) => (
            <a key={c.t} href={c.href} className="rounded-2xl border border-slate-200 p-5 transition-shadow hover:shadow-md">
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-violet-50 text-violet-700">{c.icon}</div>
              <p className="font-bold">{c.t}</p>
              <p className="mt-1 text-sm text-slate-500">{c.d}</p>
            </a>
          ))}
        </div>
      </section>

      {/* 1. Section design */}
      <Block id="sections" icon={<Palette size={14} />} eyebrow="Section design" title="Shape every section" intro="Each part of your page, like your services, your team or your contact details, can have its own heading, intro, alignment, spacing and background.">
        <div className="grid items-start gap-8 md:grid-cols-2">
          <div>
            <h3 className="mb-4 text-lg font-bold">How it works</h3>
            <Steps items={[
              <>Open <strong>Page Builder</strong> from your dashboard and stay on the <strong>Sections</strong> tab.</>,
              <>Click the arrow on the right of a section, for example <strong>Services List</strong>. A <strong>Design this section</strong> box opens.</>,
              <>Change what you like. The preview updates as you go.</>,
              <>Press <strong>Save changes</strong> to put it on your live site.</>,
            ]} />
            <h3 className="mb-3 mt-8 text-lg font-bold">What you can change</h3>
            <ul className="flex list-disc flex-col gap-2 pl-5 text-[15px] text-slate-700">
              <li><strong>Heading.</strong> Replace "Services" or "Meet the team" with your own words, like "Book your chair".</li>
              <li><strong>Short intro.</strong> One line under the heading.</li>
              <li><strong>Text alignment.</strong> Left, center or right.</li>
              <li><strong>Spacing.</strong> Tight, normal or roomy space above and below.</li>
              <li><strong>Background.</strong> Five choices, shown below.</li>
            </ul>
          </div>
          <Shot src="builder-design.jpg" alt="Design this section box for the Services section" caption="Every choice is a button or a short text box, so you can't break the layout." />
        </div>

        <div>
          <h3 className="mb-2 text-lg font-bold">Five backgrounds</h3>
          <p className="mb-5 max-w-2xl text-slate-500">The same Services section on the Studio theme with each background. Text, cards and buttons adjust so everything stays readable.</p>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {BACKGROUNDS.map((b) => (
              <Shot key={b.name} src={b.src} alt={`The ${b.name} background`} caption={<><strong className="text-slate-700">{b.name}.</strong> {b.desc}</>} />
            ))}
          </div>
          <p className="mt-6 max-w-2xl rounded-xl bg-violet-50 px-4 py-3 text-sm text-violet-900">
            For a <strong>Photo</strong> background, choose Photo, then upload a picture. Wide, simple photos work best, because a dark veil sits on top so the text stays easy to read.
          </p>
        </div>
      </Block>

      {/* 2. Hero */}
      <Block id="hero" icon={<Type size={14} />} eyebrow="Hero text" title="Say it your way at the top" intro="The first thing visitors see is your hero. Write your own headline and supporting line, and choose how the text sits.">
        <div className="grid items-start gap-8 md:grid-cols-2">
          <Shot src="hero-before.jpg" alt="A hero with the theme's default text" caption={<><strong className="text-slate-700">Before.</strong> The theme's own words.</>} />
          <Shot src="hero-after.jpg" alt="The same hero with the owner's headline, supporting line and centered text" caption={<><strong className="text-slate-700">After.</strong> Your headline and supporting line, centered, with more room around them.</>} />
        </div>
        <div className="grid items-start gap-8 md:grid-cols-2">
          <div>
            <h3 className="mb-4 text-lg font-bold">How it works</h3>
            <Steps items={[
              <>In the <strong>Page Builder</strong>, open the arrow on <strong>Hero Banner</strong>.</>,
              <>Write your <strong>Headline</strong>. Leave it empty to keep your business name or the theme's own headline.</>,
              <>Write a <strong>Supporting line</strong> that replaces the line under it.</>,
              <>Choose <strong>alignment</strong> and <strong>spacing</strong>, then <strong>Save changes</strong>.</>,
            ]} />
            <p className="mt-5 text-sm text-slate-500">Works on all 17 themes. On themes where the text sits beside a photo, alignment moves the text within its own column.</p>
          </div>
          <Shot src="builder-hero.jpg" alt="The Hero Banner section open in the Page Builder" caption="Hero Banner in the Page Builder." />
        </div>
      </Block>

      {/* 3. Blocks */}
      <Block id="blocks" icon={<MousePointerClick size={14} />} eyebrow="Your own blocks" title="Add what your theme doesn't have" intro="A story, a photo of your shop, a big button for your best offer. Add up to 8 blocks and put them wherever you like.">
        <div className="grid items-start gap-8 md:grid-cols-2">
          <Shot src="builder-add.jpg" alt="The Add Section menu with Text block, Image block and Button block" caption="Add Section, then pick a block under Your own blocks." />
          <Shot src="builder-block.jpg" alt="A Button block open for editing" caption="A Button block: heading, text, button text and link, alignment." />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            { t: 'Text block', d: 'A heading and a paragraph. Good for your story, a notice or how you work.' },
            { t: 'Image block', d: 'A wide photo with an optional heading and caption.' },
            { t: 'Button block', d: 'A heading, a line of text and a button that links to your best offer.' },
          ].map((b) => (
            <div key={b.t} className="rounded-2xl border border-slate-200 p-5"><p className="font-bold">{b.t}</p><p className="mt-1 text-sm text-slate-500">{b.d}</p></div>
          ))}
        </div>
        <div>
          <h3 className="mb-2 text-lg font-bold">They match your theme</h3>
          <p className="mb-5 max-w-2xl text-slate-500">Blocks pick up the colors of whichever theme you use. The same three blocks on a light theme and a dark theme:</p>
          <div className="grid gap-6 md:grid-cols-2">
            <Shot src="blocks-editorial.jpg" alt="Text, image and button blocks on the Editorial theme" caption="Editorial (light)." />
            <Shot src="blocks-bold.jpg" alt="Text, image and button blocks on the Bold theme" caption="Bold (dark)." />
          </div>
        </div>
        <div className="grid items-start gap-8 md:grid-cols-2">
          <div>
            <h3 className="mb-4 text-lg font-bold">How it works</h3>
            <Steps items={[
              <>Click <strong>Add Section</strong> at the bottom of the section list.</>,
              <>Choose <strong>Text block</strong>, <strong>Image block</strong> or <strong>Button block</strong>.</>,
              <>Fill it in. For an Image block, upload your photo.</>,
              <>Drag it to where you want it among your sections, then <strong>Save changes</strong>.</>,
            ]} />
          </div>
          <div>
            <h3 className="mb-4 text-lg font-bold">Good to know</h3>
            <ul className="flex list-disc flex-col gap-2 pl-5 text-[15px] text-slate-700">
              <li>Up to 8 blocks per page.</li>
              <li>Button links can go to a web page (<code className="rounded bg-slate-100 px-1">https://…</code>), an email (<code className="rounded bg-slate-100 px-1">mailto:</code>), a phone number (<code className="rounded bg-slate-100 px-1">tel:</code>) or a spot on your page like <code className="rounded bg-slate-100 px-1">#services</code>.</li>
              <li>Use the eye icon to hide a block without deleting it, or "Remove this block" to delete it.</li>
            </ul>
          </div>
        </div>
      </Block>

      {/* 4. Reordering */}
      <Block id="reorder" icon={<GripVertical size={14} />} eyebrow="Reordering" title="Everything in the order you choose" intro="Put your best service first, your busiest barber at the top, your most common question where people will see it.">
        <div className="grid items-start gap-8 md:grid-cols-2">
          <Shot src="reorder-services.jpg" alt="The Services list with a drag handle and up and down arrows on each row" caption="Each row has a handle for dragging and small arrows for moving it up or down." />
          <div>
            <h3 className="mb-4 text-lg font-bold">How it works</h3>
            <Steps items={[
              <>On a computer, grab the <strong>dotted handle</strong> at the start of a row and drag it where you want it.</>,
              <>On a phone or tablet, tap the <strong>up and down arrows</strong> instead.</>,
              <>The order saves straight away and shows on your site, on every theme.</>,
            ]} />
            <h3 className="mb-3 mt-8 text-lg font-bold">Where you can do it</h3>
            <ul className="flex list-disc flex-col gap-1.5 pl-5 text-[15px] text-slate-700">
              <li><strong>Services</strong>, <strong>Products</strong> and <strong>Team</strong>: on their pages in your dashboard.</li>
              <li><strong>FAQ</strong> and <strong>Testimonials</strong>: in the Page Builder's Content tab.</li>
              <li><strong>Whole sections</strong> (and your blocks): drag them in the Page Builder's Sections tab.</li>
            </ul>
            <p className="mt-4 text-sm text-slate-500">New services, products and team members go to the end of the list. Reordering is available on every plan.</p>
          </div>
        </div>
      </Block>

      {/* Themes */}
      <Block id="themes" icon={<LayoutGrid size={14} />} eyebrow="Themes and plans" title="What works where" intro="All of this works on every theme, with one difference: backgrounds are on the four booking themes for now.">
        <div className="overflow-x-auto rounded-2xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-5 py-3 font-semibold">Design option</th>
                <th className="px-5 py-3 text-center font-semibold">Barber, Studio, Ink, Roster</th>
                <th className="px-5 py-3 text-center font-semibold">The other 13 themes</th>
              </tr>
            </thead>
            <tbody>
              {MATRIX.map((r) => (
                <tr key={r.feature} className="border-t border-slate-100">
                  <td className="px-5 py-3 text-slate-700">{r.feature}</td>
                  {[r.booking, r.other].map((ok, i) => (
                    <td key={i} className="px-5 py-3 text-center">{ok ? <Check size={18} className="mx-auto text-emerald-600" aria-label="Included" /> : <Minus size={18} className="mx-auto text-slate-300" aria-label="Not available" />}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 p-6">
            <p className="font-bold">Free plan</p>
            <p className="mt-2 text-sm text-slate-600">Your theme's own layout, plus reordering your services, products, team, FAQ and testimonials, and moving whole sections around.</p>
          </div>
          <div className="rounded-2xl border-2 p-6" style={{ borderColor: BRAND }}>
            <p className="font-bold">Pro and Business</p>
            <p className="mt-2 text-sm text-slate-600">Everything above: section design, hero text, background choices, your own blocks. If you ever go back to the free plan, your choices stop showing but aren't deleted. Upgrade again and they come back.</p>
          </div>
        </div>
      </Block>

      {/* FAQ */}
      <section className="border-t border-slate-100 px-6 py-16">
        <div className="mx-auto max-w-3xl">
          <h2 className="mb-8 text-3xl font-extrabold tracking-tight">Questions</h2>
          <div className="flex flex-col gap-6">
            {[
              { q: 'Will it still look good on a phone?', a: 'Yes. Every option is a choice from a short list that we\'ve tested on phones and desktops, so you can\'t place something off-screen or make text unreadable.' },
              { q: 'Do my changes go live right away?', a: 'They show in the Page Builder preview as you make them. They go on your live site when you press Save changes.' },
              { q: 'Can I use my own brand color?', a: 'Yes. Set it once on the Theme tab. The Brand background and your buttons use it everywhere.' },
              { q: 'What if I change my theme later?', a: 'Your headings, intros, blocks and order come with you. Background choices only show on themes that support them, and come back if you switch to one that does.' },
              { q: 'I want to undo something.', a: 'Clear a heading or intro to go back to the theme\'s text, set a background back to Theme, or remove a block. Nothing changes on your live site until you save.' },
            ].map((f) => (
              <div key={f.q}>
                <p className="font-bold">{f.q}</p>
                <p className="mt-1 text-slate-600">{f.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 text-center" style={{ background: 'linear-gradient(180deg, #ffffff 0%, #f5f3ff 100%)' }}>
        <div className="mx-auto max-w-2xl">
          <h2 className="text-4xl font-extrabold tracking-tight">Start free. Make it yours when you're ready.</h2>
          <p className="mt-4 text-lg text-slate-500">Build your site today on the free plan and upgrade when you want the full set of design options.</p>
          <Link to="/sign-up" className="mt-8 inline-flex items-center gap-2 rounded-xl px-8 py-4 text-sm font-bold text-white shadow-lg shadow-violet-200 transition-opacity hover:opacity-90" style={{ background: BRAND }}>Build my website free <ArrowRight size={16} /></Link>
        </div>
      </section>

      <footer className="border-t border-slate-100 px-6 py-6 text-center text-sm text-slate-500">
        <Link to="/privacy" className="hover:text-slate-800">Privacy</Link> · <Link to="/terms" className="hover:text-slate-800">Terms</Link> · <Link to="/refunds" className="hover:text-slate-800">Refunds</Link> · <Link to="/guide" className="hover:text-slate-800">Get prepared</Link>
      </footer>
    </div>
  );
}
