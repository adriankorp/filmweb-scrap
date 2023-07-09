import { describe, expect, test } from '@jest/globals';
import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import {
    checkDuplicates,
    getHtml,
    getMovieRating,
    getMovieTitle,
    getTopFourProviders,
    getTopTenMovies,
    parseMoviesData,
    parseProviderName,
    saveToCsv,
    sortMoviesByRating,
} from '../src/functions';
import { Movie, ParsedMovie, Provider } from '../src/interface';

describe('functions tests', () => {
    // Tests that the function returns the HTML content of a valid URL
    test('test_valid_url', async () => {
        const url = 'https://www.google.com';
        const html = await getHtml(url);
        expect(html).toBeDefined();
    });

    // Tests that the function throws an error when the URL is not valid
    test('test_invalid_url', async () => {
        const url = 'invalid url';
        await expect(getHtml(url)).rejects.toThrow();
    });

    // Tests that the function throws an error when the request fails
    test('test_request_failure', async () => {
        const url = 'https://www.google.com/404';
        await expect(getHtml(url)).rejects.toThrow();
    });
    // Tests that the function returns an array of length 4
    test('test_happy_path_returns_array_of_length_4', async () => {
        const result = await getTopFourProviders();
        expect(result).toHaveLength(4);
    });
    // Tests that each element of the array has a 'providerName' property and 'providerUrl' property
    test('test_happy_path_each_element_has_provider_name_property', async () => {
        const result = await getTopFourProviders();
        result.forEach((provider) => {
            expect(provider).toHaveProperty('providerName');
            expect(provider).toHaveProperty('providerUrl');
        });
    });
    // Tests that when the HTML does not contain a '.rankingProvider__list' element, the function returns an empty array
    test('test_edge_case_no_ranking_provider_list_returns_empty_array', async () => {
        const html = '<html><body></body></html>';
        jest.spyOn(axios, 'get').mockResolvedValue({ data: html });
        const result = await getTopFourProviders();
        expect(result).toEqual([]);
    });
    // Tests that when the '.rankingProvider__list' element does not contain any 'li' elements, the function returns an empty array
    test('test_edge_case_ranking_provider_list_no_li_elements_returns_empty_array', async () => {
        const html = '<html><body><div class="rankingProvider__list"></div></body></html>';
        jest.spyOn(axios, 'get').mockResolvedValue({ data: html });
        const result = await getTopFourProviders();
        expect(result).toEqual([]);
    });
    // Tests that when the '.rankingProvider__list' element contains less than 4 'li' elements, the function returns an array with length less than 4
    it('test_edge_case_ranking_provider_list_less_than_4_li_elements_returns_array_with_length_less_than_4', async () => {
        const html = '<html><body><div class="rankingProvider__list"><ul><li></li><li></li></ul></div></body></html>';
        jest.spyOn(axios, 'get').mockResolvedValue({ data: html });
        const result = await getTopFourProviders();
        expect(result).toHaveLength(2);
    });
    // Tests that the function returns the movie title when given a valid cheerio object and movie element with a title
    test('test_valid_title', () => {
        const $ = cheerio.load(
            '<div class="rankingList_title"><div class="rankingType__title"><a>Valid Title</a></div></div>',
        );
        const movie = $('.rankingList_title')[0];
        expect(getMovieTitle($, movie)).toBe('Valid Title');
    });
    // Tests that the function returns an empty string when given a valid cheerio object and movie element without a title
    test('test_empty_string_no_title', () => {
        const $ = cheerio.load(
            '<div class="rankingList_title"><div class="rankingType__title"></div></div>',
        );
        const movie = $('.rankingList_title')[0];
        expect(getMovieTitle($, movie)).toBe('');
    });
    // Tests that the function returns an empty string when given an invalid cheerio object
    test('test_empty_string_invalid_cheerio', () => {
        const $ = cheerio.load('<div></div>');
        const movie = $('.rankingType__title')[0];
        expect(getMovieTitle($, movie)).toBe('');
    });
    // Tests that the function returns an empty string when given an invalid movie element
    test('test_empty_string_invalid_movie_element', () => {
        const $ = cheerio.load(
            '<div class="rankingType__title"><a>Valid Title</a></div>',
        );
        const movie = $('.invalid_movie_element')[0];
        expect(getMovieTitle($, movie)).toBe('');
    });
    // Tests that the function returns an empty string when given a movie element with a title that is only whitespace
    test('test_whitespace_title', () => {
        const $ = cheerio.load(
            '<div class="rankingList_title"><div class="rankingType__title"><a>   </a></div></div>',
        );
        const movie = $('.rankingList_title')[0];
        expect(getMovieTitle($, movie)).toBe('');
    });
    // Tests that the function returns the rating of a movie when given a valid cheerio object and movie element with rating
    test('test_happy_path_rating_found', () => {
        const $ = cheerio.load(
            '<div class="ranking__list"> <div class="rankingType__rate--value">8.5</div></div>',
        );
        const movie = $('.ranking__list')[0];
        const rating = getMovieRating($, movie);
        expect(rating).toBe('8.5');
    });
    // Tests that the function returns an empty string when the rating element is not found
    test('test_happy_path_rating_not_found', () => {
        const $ = cheerio.load('<div></div>');
        const movie = $('.ranking__list')[0];
        const rating = getMovieRating($, movie);
        expect(rating).toBe('');
    });
    // Tests that the function returns an empty string when the rating element is found but has no text
    test('test_edge_case_rating_not_found_or_has_no_text', () => {
        const $ = cheerio.load(
            '<div class="ranking__list"> <div class="rankingType__rate--value"></div></div>',
        );
        const movie = $('.ranking__list')[0];
        const rating = getMovieRating($, movie);
        expect(rating).toBe('');
    });
    // Tests that an empty array is returned when providerUrl is undefined
    test('test_empty_provider_url', async () => {
        const movies = await getTopTenMovies(
            undefined,
            '2021',
            'Provider Name',
        );
        expect(movies).toEqual([]);
    });
    // Tests that an empty array is returned when no movies are found on the page
    test('test_no_movies_found', async () => {
        const movies = await getTopTenMovies(
            '/ranking/film',
            '2021',
            'Provider Name',
        );
        expect(movies).toEqual([]);
    });
    // Tests that the returned movies have the correct providerName
    it('test_correct_provider_name', async () => {
        const movies = await getTopTenMovies(
            '/ranking/film',
            '2021',
            'Provider Name',
        );
        expect(
            movies.every((movie) => {
                return movie.providerName === 'Provider Name';
            }),
        ).toBe(true);
    });
    // Tests that an empty string is returned when providerName is undefined
    test('test_empty_provider_name', () => {
        expect(parseProviderName(undefined)).toBe('');
    });
    // Tests that an empty string is returned when providerName is an empty string
    test('test_empty_string_provider_name', () => {
        expect(parseProviderName('')).toBe('');
    });
    // Tests that an empty string is returned when providerName is a single space
    test('test_single_space_provider_name', () => {
        expect(parseProviderName(' ')).toBe('');
    });
    // Tests that the full provider name is returned when providerName has only one word
    test('test_single_word_provider_name', () => {
        expect(parseProviderName('Netflix')).toBe('Netflix');
    });
    // Tests that the function returns an array
    test('test_returns_array', () => {
        const moviesData: Movie[][] = [[], [], [], []];
        const result = parseMoviesData(moviesData);
        expect(Array.isArray(result)).toBe(true);
        expect(result).toHaveLength(0);
    });
    // Tests that the function returns an array of objects
    test('test_returns_array_of_objects', () => {
        const moviesData = [
            [{ title: 'Movie 1', rating: '8.5', providerName: 'Provider 1' }],
            [{ title: 'Movie 2', rating: '7.5', providerName: 'Provider 2' }],
        ];
        const result = parseMoviesData(moviesData);
        expect(
            result.every((movie) => {
                return typeof movie === 'object';
            }),
        ).toBe(true);
    });
    // Tests that the function returns an array of objects with the expected properties
    test('test_returns_array_of_objects_with_expected_properties', () => {
        const moviesData = [
            [{ title: 'Movie 1', rating: '8.5', providerName: 'Provider 1' }],
            [{ title: 'Movie 2', rating: '7.5', providerName: 'Provider 2' }],
        ];
        const result = parseMoviesData(moviesData);
        expect(
            result.every((movie) => {
                return (
                    Object.keys(movie).length === 4
                    && 'title' in movie
                    && 'rating' in movie
                    && 'providerName' in movie
                    && 'floatRating' in movie
                );
            }),
        ).toBe(true);
    });
    // Tests that the function correctly parses the rating to a floating point number
    test('test_parses_rating_to_float', () => {
        const moviesData = [
            [{ title: 'Movie 1', rating: '8,5', providerName: 'Provider 1' }],
            [{ title: 'Movie 2', rating: '7,5', providerName: 'Provider 2' }],
        ];
        const result = parseMoviesData(moviesData);
        expect(
            result.every((movie) => {
                return typeof movie.floatRating === 'number';
            }),
        ).toBe(true);
        expect(result[0].floatRating).toBe(8.5);
        expect(result[1].floatRating).toBe(7.5);
    });
    // Tests that the function handles an array with empty sub-arrays
    test('test_handles_array_with_empty_subarrays', () => {
        const moviesData = [
            [],
            [{ title: 'Movie 1', rating: '8.5', providerName: 'Provider 1' }],
            [],
            [{ title: 'Movie 2', rating: '7.5', providerName: 'Provider 2' }],
            [],
        ];
        const result = parseMoviesData(moviesData);
        expect(result.length).toBe(2);
    });

    // Tests that the function sorts an array of movies with different ratings in descending order
    it('test_different_ratings', () => {
        const moviesData = [
            {
                title: 'Movie A',
                rating: '8.5',
                providerName: 'Provider 1',
                floatRating: 8.5,
            },
            {
                title: 'Movie B',
                rating: '7.2',
                providerName: 'Provider 2',
                floatRating: 7.2,
            },
            {
                title: 'Movie C',
                rating: '9.1',
                providerName: 'Provider 3',
                floatRating: 9.1,
            },
        ];
        const sortedMoviesData = sortMoviesByRating(moviesData);
        expect(sortedMoviesData).toEqual([
            {
                title: 'Movie C',
                rating: '9.1',
                providerName: 'Provider 3',
                floatRating: 9.1,
            },
            {
                title: 'Movie A',
                rating: '8.5',
                providerName: 'Provider 1',
                floatRating: 8.5,
            },
            {
                title: 'Movie B',
                rating: '7.2',
                providerName: 'Provider 2',
                floatRating: 7.2,
            },
        ]);
    });
    // Tests that the function sorts an array of movies with same ratings in descending order
    it('test_same_ratings', () => {
        const moviesData = [
            {
                title: 'Movie A',
                rating: '8.5',
                providerName: 'Provider 1',
                floatRating: 8.5,
            },
            {
                title: 'Movie B',
                rating: '8.5',
                providerName: 'Provider 2',
                floatRating: 8.5,
            },
            {
                title: 'Movie C',
                rating: '8.5',
                providerName: 'Provider 3',
                floatRating: 8.5,
            },
        ];
        const sortedMoviesData = sortMoviesByRating(moviesData);
        expect(sortedMoviesData).toEqual([
            {
                title: 'Movie A',
                rating: '8.5',
                providerName: 'Provider 1',
                floatRating: 8.5,
            },
            {
                title: 'Movie B',
                rating: '8.5',
                providerName: 'Provider 2',
                floatRating: 8.5,
            },
            {
                title: 'Movie C',
                rating: '8.5',
                providerName: 'Provider 3',
                floatRating: 8.5,
            },
        ]);
    });
    // Tests that the function returns an empty array when given an empty array
    it('test_empty_array', () => {
        const moviesData: ParsedMovie[] = [];
        const sortedMoviesData = sortMoviesByRating(moviesData);
        expect(sortedMoviesData).toEqual([]);
    });
    it('test_empty_array', () => {
        const input: ParsedMovie[] = [];
        const output = checkDuplicates(input);
        expect(output).toEqual([]);
    });
    // Tests that function returns the same array when an array of unique movies is passed as input
    it('test_unique_movies', () => {
        const input = [
            {
                title: 'Movie 1',
                rating: '8.5',
                providerName: 'Provider 1',
                floatRating: 8.5,
            },
            {
                title: 'Movie 2',
                rating: '7.5',
                providerName: 'Provider 2',
                floatRating: 7.5,
            },
            {
                title: 'Movie 3',
                rating: '9.0',
                providerName: 'Provider 3',
                floatRating: 9.0,
            },
        ];
        const output = checkDuplicates(input);
        expect(output).toEqual(input);
    });
    // Tests that function removes duplicates with lower ratings when an array of movies with duplicates and different ratings is passed as input
    it('test_duplicates_different_ratings', () => {
        const input = [
            {
                title: 'Movie 1',
                rating: '8.5',
                providerName: 'Provider 1',
                floatRating: 8.5,
            },
            {
                title: 'Movie 2',
                rating: '7.5',
                providerName: 'Provider 2',
                floatRating: 7.5,
            },
            {
                title: 'Movie 1',
                rating: '9.0',
                providerName: 'Provider 3',
                floatRating: 9.0,
            },
        ];
        const output = checkDuplicates(input);
        expect(output).toEqual([
            {
                title: 'Movie 1',
                rating: '9.0',
                providerName: 'Provider 3',
                floatRating: 9.0,
            },
            {
                title: 'Movie 2',
                rating: '7.5',
                providerName: 'Provider 2',
                floatRating: 7.5,
            },
        ]);
    });
    // Tests that function removes duplicates with lower ratings when an array of movies with duplicates and same ratings is passed as input
    it('test_duplicates_same_ratings', () => {
        const input = [
            {
                title: 'Movie 1',
                rating: '8.5',
                providerName: 'Provider 1',
                floatRating: 8.5,
            },
            {
                title: 'Movie 2',
                rating: '7.5',
                providerName: 'Provider 2',
                floatRating: 7.5,
            },
            {
                title: 'Movie 1',
                rating: '8.5',
                providerName: 'Provider 3',
                floatRating: 8.5,
            },
        ];
        const output = checkDuplicates(input);
        expect(output).toEqual([
            {
                title: 'Movie 1',
                rating: '8.5',
                providerName: 'Provider 1',
                floatRating: 8.5,
            },
            {
                title: 'Movie 2',
                rating: '7.5',
                providerName: 'Provider 2',
                floatRating: 7.5,
            },
        ]);
    });
    // Tests that function removes duplicates with lower ratings when an array of movies with duplicates and all same ratings is passed as input
    it('test_duplicates_all_same_ratings', () => {
        const input = [
            {
                title: 'Movie 1',
                rating: '8.5',
                providerName: 'Provider 1',
                floatRating: 8.5,
            },
            {
                title: 'Movie 1',
                rating: '8.5',
                providerName: 'Provider 2',
                floatRating: 8.5,
            },
            {
                title: 'Movie 1',
                rating: '8.5',
                providerName: 'Provider 3',
                floatRating: 8.5,
            },
        ];
        const output = checkDuplicates(input);
        expect(output).toEqual([
            {
                title: 'Movie 1',
                rating: '8.5',
                providerName: 'Provider 1',
                floatRating: 8.5,
            },
        ]);
    });
    // Tests that function removes duplicates with lower ratings when an array of movies with duplicates and all different ratings is passed as input
    it('test_duplicates_all_different_ratings', () => {
        const input = [
            {
                title: 'Movie 1',
                rating: '8.5',
                providerName: 'Provider 1',
                floatRating: 8.5,
            },
            {
                title: 'Movie 2',
                rating: '7.5',
                providerName: 'Provider 2',
                floatRating: 7.5,
            },
            {
                title: 'Movie 1',
                rating: '9.0',
                providerName: 'Provider 3',
                floatRating: 9.0,
            },
            {
                title: 'Movie 2',
                rating: '8.0',
                providerName: 'Provider 4',
                floatRating: 8.0,
            },
        ];
        const output = checkDuplicates(input);
        expect(output).toEqual([
            {
                title: 'Movie 1',
                rating: '9.0',
                providerName: 'Provider 3',
                floatRating: 9.0,
            },
            {
                title: 'Movie 2',
                rating: '8.0',
                providerName: 'Provider 4',
                floatRating: 8.0,
            },
        ]);
    });
    // Tests that saveToCsv function saves the CSV file to disk
    it('test_save_to_csv_saves_file_to_disk', async () => {
        const moviesData = [
            {
                title: 'Movie 1',
                rating: '4.5',
                providerName: 'Provider 1',
                floatRating: 4.5,
            },
            {
                title: 'Movie 2',
                rating: '3.2',
                providerName: 'Provider 2',
                floatRating: 3.2,
            },
        ];
        await saveToCsv(moviesData);
        const csv = await fs.promises.readFile('./movies.csv', 'utf-8');
        expect(csv).toBeDefined();
    });
    // Tests that saveToCsv function correctly formats the CSV objects
    it('test_save_to_csv_formats_csv_objects_correctly', async () => {
        const moviesData = [
            {
                title: 'Movie 1',
                rating: '4.5',
                providerName: 'Provider 1',
                floatRating: 4.5,
            },
            {
                title: 'Movie 2',
                rating: '3.2',
                providerName: 'Provider 2',
                floatRating: 3.2,
            },
        ];
        await saveToCsv(moviesData);
        const csv = await fs.promises.readFile('./movies.csv', 'utf-8');
        expect(csv).toContain('Title,VOD name,Rating');
        expect(csv).toContain('Movie 1,Provider 1,4.5');
        expect(csv).toContain('Movie 2,Provider 2,3.2');
    });
    // Tests that saveToCsv function handles empty input array
    it('test_save_to_csv_handles_empty_input_array', async () => {
        const moviesData: ParsedMovie[] = [];
        await saveToCsv(moviesData);
        const csv = await fs.promises.readFile('./movies.csv', 'utf-8');
        expect(csv).toBeDefined();
    });
});
