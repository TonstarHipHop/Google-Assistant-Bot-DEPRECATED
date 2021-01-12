module.exports = {
    name: "ping",
    category: "info",
    description: "Returns latency and API ping",
    run: async (client, message, args) => {
        if (!message) {
            return null;
        }
        const msg = await message.channel.send("Pinging...");
        msg.edit(`Pong\nLatency: ${Math.floor(msg.createdAt - message.createdAt)}\nAPI Latency ${Math.round(client.ws.ping)}ms`);
    }
}