// Specials — rotating "this week on the bar" cards. Content is editable from the
// admin Site Content tab (Specials group) and published via /api/content.
function Specials() {
  const cards = [1, 2, 3]
    .map((i) => ({
      tag: SITE('specials_' + i + '_tag'),
      name: SITE('specials_' + i + '_name'),
      desc: SITE('specials_' + i + '_desc'),
      price: SITE('specials_' + i + '_price'),
    }))
    .filter((c) => c.name); // a blank name hides the card

  return (
    <section className="section" id="specials" data-screen-label="Specials">
      <div className="row-tag">
        <span className="label">{SITE('specials_label')}</span>
        <span className="label">idx 0002b</span>
      </div>

      <div className="specials-head">
        <h2 className="huge">
          {SITE('specials_h1')}<br/>
          <span className="serif">{SITE('specials_h2')}</span>
        </h2>
        <p className="large" style={{ maxWidth: 460 }}>{SITE('specials_intro')}</p>
      </div>

      <div className="specials-grid">
        {cards.map((c, i) => (
          <article className="special-card" key={i}>
            {c.tag ? <div className="special-tag">{c.tag}</div> : null}
            <h3 className="special-name serif">{c.name}</h3>
            {c.desc ? <p className="special-desc">{c.desc}</p> : null}
            {c.price ? <div className="special-price">{c.price}</div> : null}
          </article>
        ))}
      </div>
    </section>
  );
}

Object.assign(window, { Specials });
