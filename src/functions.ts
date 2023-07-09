import axios from 'axios';
import * as cheerio from 'cheerio';
import ObjectsToCsv from 'objects-to-csv';
import { Movie, ParsedMovie } from './interface';

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
    return providers;
};

const getMovieTitle = ($: cheerio.CheerioAPI, movie: cheerio.Element) => {
    const title = $(movie).find('.rankingType__title').find('a').text();

    if (!title.trim()) {
        return '';
    }

    return title;
};

const getMovieRating = ($: cheerio.CheerioAPI, movie: cheerio.Element) => {
    const rating = $(movie).find('.rankingType__rate--value').text();
    return rating;
};

const getTopTenMovies = async (
    providerUrl: string | undefined,
    year: string,
    providerName: string,
) => {
    if (!providerUrl) {
        return [];
    }

    const html = await getHtml(`${URL}${providerUrl}/${year}`);
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
                providerName,
            };
            return movie;
        })
        .get();
    return moviesData;
};

const getCurrentYear = () => {
    const date = new Date();
    const year = date.getFullYear();
    return year.toString();
};

const parseProviderName = (providerName: string | undefined) => {
    if (!providerName) {
        return '';
    }
    const providerNameArray = providerName.split(' ');

    if (providerNameArray.length === 1) {
        return providerName;
    }

    const parsedProviderName = providerNameArray
        .slice(0, providerNameArray.length - 1)
        .join(' ');
    return parsedProviderName;
};

const parseMoviesData = (moviesData: Movie[][]) => {
    const flatMoviesData = moviesData.flat();

    const parsedMoviesData = flatMoviesData.map((movie) => {
        const parsedMovie = {
            ...movie,
            floatRating: parseFloat(movie.rating.replace(',', '.')),
        };
        return parsedMovie;
    });
    return parsedMoviesData;
};

const sortMoviesByRating = (moviesData: ParsedMovie[]) => {
    const sortedMoviesData = moviesData.sort((a, b) => {
        return b.floatRating - a.floatRating;
    });
    return sortedMoviesData;
};

const checkDuplicates = (moviesData: ParsedMovie[]) => {
    const checkedDuplicates = moviesData.reduce((acc, movie) => {
        if (acc.has(movie.title)) {
            const accMovie = acc.get(movie.title);
            if (accMovie && accMovie.floatRating < movie.floatRating) {
                acc.set(movie.title, movie);
            }
        } else {
            acc.set(movie.title, movie);
        }
        return acc;
    }, new Map<string, ParsedMovie>());
    return [...checkedDuplicates.values()];
};

const saveToCsv = async (moviesData: ParsedMovie[]) => {
    const csvObjects = moviesData.map((movie) => {
        const csvObject = {
            Title: movie.title,
            'VOD name': movie.providerName,
            Rating: movie.rating,
        };
        return csvObject;
    });

    const csv = new ObjectsToCsv(csvObjects);
    try {
        await csv.toDisk('./movies.csv');
    } catch (error) {
        console.error('Error writing to disk:', error);
    }
};

export {
    getTopFourProviders,
    getTopTenMovies,
    getCurrentYear,
    getMovieTitle,
    getMovieRating,
    parseProviderName,
    parseMoviesData,
    sortMoviesByRating,
    checkDuplicates,
    saveToCsv,
    getHtml,
};
