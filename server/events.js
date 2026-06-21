// Minimal in-process Server-Sent Events hub.
const channels = new Map(); // channel -> Set<res>

function subscribe(channel, res) {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.write(': connected\n\n');
  if (!channels.has(channel)) channels.set(channel, new Set());
  channels.get(channel).add(res);

  const keepAlive = setInterval(() => res.write(': ping\n\n'), 25000);
  res.on('close', () => {
    clearInterval(keepAlive);
    const set = channels.get(channel);
    if (set) { set.delete(res); if (set.size === 0) channels.delete(channel); }
  });
}

function publish(channel, data) {
  const set = channels.get(channel);
  if (!set) return;
  const payload = `data: ${JSON.stringify(data)}\n\n`;
  for (const res of set) res.write(payload);
}

module.exports = { subscribe, publish };
