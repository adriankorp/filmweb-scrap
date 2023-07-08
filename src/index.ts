import axios from 'axios';
import * as cheerio from 'cheerio';

const URL_RANKING = 'https://www.filmweb.pl/ranking/vod/film';
const URL = 'https://www.filmweb.pl';

const getHtml = async (url: string) => {
    const { data } = await axios.get(url);
    return data;
};

const getTopFourProviders = async () => {
    const html = await getHtml(URL_RANKING);
    const $ = cheerio.load(html);
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

const getMovieTitle = ($: cheerio.CheerioAPI, movie: cheerio.Element) => {
    const title = $(movie).find('.rankingType__title').find('a').text();
    return title;
};

const getMovieRating = ($: cheerio.CheerioAPI, movie: cheerio.Element) => {
    const rating = $(movie).find('.rankingType__rate--value').text();
    return rating;
};

const getTopTenMovies = async (url: string | undefined, year: string) => {
    if (!url) {
        return;
    }
    const html = await getHtml(`${URL}${url}/${year}`);
    const $ = cheerio.load(html);
    const moviesList = $('.rankingTypeSection__container');
    const movies = moviesList.find('.rankingType.hasVod');
    const topTenMovies = movies.slice(0, 10);

    const moviesData = topTenMovies
        .map((i, el) => {
            const title = getMovieTitle($, el);
            const rating = getMovieRating($, el);
            const movie = {
                title,
                rating,
            };
            return movie;
        })
        .get();

    console.log(moviesData);
};

const getActualYear = () => {
    const date = new Date();
    const year = date.getFullYear();
    return year.toString();
};

const main = async () => {
    const providers = await getTopFourProviders();
    const actualYear = getActualYear();

    const moviesData = Promise.all(
        providers.map(async (provider) => {
            await getTopTenMovies(provider.providerUrl, actualYear);
        }),
    );
    console.log(moviesData);
};

main();
