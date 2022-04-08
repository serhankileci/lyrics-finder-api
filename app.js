import express from "express";
const app = express();
import rateLimit from "express-rate-limit";
import axios from "axios";
import { parse } from "node-html-parser";

const reqLimiter = rateLimit({
	windowMs: 1 * 60 * 1000,
	max: 100
});

app.get("/:artist/:track", reqLimiter, async (req, res) => {
    
    // replace params to be alphanumeric and inline with genius.com artist/track url params
    const [artist, track] = [req.params.artist, req.params.track]
                            .map(elem => elem = elem.replace(/[^a-z0-9\-]/gi, ""));

    try {
        const response = await axios.get(`https://www.genius.com/${artist}-${track}-lyrics`)
                                    .then(res => [res.status, res.data])
                                    .catch(err => err);
        
        if (response[0] === 200) {
            // get lyrics div
            let lyrics = parse(response[1])
                        .querySelector(".kZmmHP")
                        .structuredText;

            // get index of brackets for non-lyrics ("verse", "chorus", etc.) and rm
            const indexesOfBrackets = [...lyrics.matchAll(/[\[\]]/g)].map(elem => elem.index);
            const brackets = [];

            for (let i = 0; i < indexesOfBrackets.length; i += 2) {
                brackets.push(lyrics.slice(indexesOfBrackets[i], indexesOfBrackets[i + 1] + 1));
            }
            brackets.map(elem => lyrics = lyrics.replace(elem, ""));
    
            // rm redundant whitespace, and more non-lyrics
            lyrics = lyrics
                    .replace(/[\n]{2,}/g, "\n")
            const splitLyrics = lyrics.split("\n");
            lyrics = lyrics
                    .slice(lyrics.indexOf("\n"), lyrics.indexOf(splitLyrics[splitLyrics.length - 2]))
                    .trim();
            
            return res.status(200).json(JSON.stringify(lyrics));
        } else {
            throw new Error(`Could not find the lyrics for: '${artist}/${track}'`);
        }
    } catch (err) {
        return res.status(404).json(err.message);
    }
});

app.listen(process.env.PORT || 80);