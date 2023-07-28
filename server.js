const http = require("http");
const https = require("https");
const PORT = process.env.PORT || 5000;

function fetchDataFromTime(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            if (res.statusCode === 301 || res.statusCode === 302) {
                return fetchDataFromTime(res.headers.location)
                    .then(resolve)
                    .catch(reject);
            }

            const dataChunks = [];

            res.on("data", (chunk) => {
                dataChunks.push(chunk);
            });

            res.on("end", () => {
                try {
                    resolve(dataChunks.join(""));
                } catch (err) {
                    reject(err);
                }
            });
        }).on("error", (err) => {
            reject(err);
        });
    });
}

function extractNewsData(data) {
    const newsItems = data.match(
        /<a href="\/.*\/">\s*<h3 class="latest-stories__item-headline">.*<\/h3>/g
    );

    const newsData = [];
    for (let i = 0; i < Math.min(6, newsItems.length); ++i) {
        const linkMatch = newsItems[i].match(/\/\d+\/.+\//g);
        const titleMatch = newsItems[i].match(/<h3[^>]*>(.*?)<\/h3>/);

        if (linkMatch && titleMatch) {
            newsData.push({
                title: titleMatch[1],
                link: "https://time.com" + linkMatch[0],
            });
        }
    }

    return newsData;
}

const server = http.createServer((req, res) => {
    if (req.url === "/getTimeStories" && req.method === "GET") {
        fetchDataFromTime("https://www.time.com")
            .then((responseData) => {
                const newsData = extractNewsData(responseData);

                res.writeHead(200, { "Content-Type": "application/json" });
                res.write(JSON.stringify(newsData));
                res.end();
            })
            .catch((err) => {
                res.writeHead(500, { "Content-Type": "application/json" });
                res.end(JSON.stringify({ message: "Internal Server Error" }));
            });
    } else {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ message: "Route not found" }));
    }
});

server.listen(PORT, () => {
    console.log(`Server running on port: ${PORT}`);
});
