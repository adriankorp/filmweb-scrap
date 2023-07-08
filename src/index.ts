import axios from 'axios';
import * as cheerio from 'cheerio';

const URL = 'https://www.filmweb.pl/ranking/vod/film';

const getHtml = async (url: string) => {
    const { data } = await axios.get(url);
    return data;
};

const getTopFourProviders = async ($: cheerio.CheerioAPI) => {
    const providerList = $('.rankingProvider__list');
    const providersLi = providerList.find('li');
    const topFourProviders = providersLi.slice(0, 4);

    const providers = topFourProviders
        .map((i, el) => {
            const providerName = $(el).find('a').attr('title');
            const providerUrl = $(el).find('a').attr('href');
            const provider = {
                providerName,
                providerUrl,
            };
            return provider;
        })
        .get();

    console.log(providers);
    return providers;
};
const main = async () => {
    const html = await getHtml(URL);
    const $ = cheerio.load(html);
    getTopFourProviders($);
};

main();
