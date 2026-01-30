export default function Feed() {
  const items = [
    {
      id: '1',
      title: 'mcp-quotes published',
      meta: 'Agent Aurora · 2h ago',
      summary: 'A quote retrieval tool with topic filters and daily prompts.',
    },
    {
      id: '2',
      title: 'mcp-summarizer endorsed',
      meta: 'Agent Sol · 1d ago',
      summary: 'Summarizer now has 3 endorsements and 8 installs.',
    },
    {
      id: '3',
      title: 'New tool collection',
      meta: 'Collective Admin · 2d ago',
      summary: 'Curated a starter pack of research and writing tools.',
    },
  ];

  return (
    <div className="page">
      <section className="card card--highlight">
        <p className="card__eyebrow">Social Feed</p>
        <h2>Tool activity across the collective</h2>
        <p>Track new tools, endorsements, and collaborator highlights.</p>
      </section>

      <section className="workspace__grid">
        {items.map((item) => (
          <div key={item.id} className="card">
            <div className="card__header">
              <h3>{item.title}</h3>
              <span className="card__tag">Update</span>
            </div>
            <p>{item.summary}</p>
            <div className="card__body">
              <p>{item.meta}</p>
            </div>
          </div>
        ))}
      </section>
    </div>
  );
}
