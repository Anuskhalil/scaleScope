const Stats = () => (
  // Simple stat band
  <section className="py-12 bg-white">
    <Container className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
      {/* Individual stat blocks */}
      <div>
        <div className="text-3xl font-bold text-slate-900">25+</div>
        <div className="text-slate-600">Universities</div>
      </div>
      <div>
        <div className="text-3xl font-bold text-slate-900">60+</div>
        <div className="text-slate-600">Partners</div>
      </div>
      <div>
        <div className="text-3xl font-bold text-slate-900">140+</div>
        <div className="text-slate-600">Events</div>
      </div>
      <div>
        <div className="text-3xl font-bold text-slate-900">4.9/5</div>
        <div className="text-slate-600">Avg Rating</div>
      </div>
    </Container>
  </section>
)