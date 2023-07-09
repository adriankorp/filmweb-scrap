import * as fcs from './functions';

const main = async () => {
    const providers = await fcs.getTopFourProviders();

    const currentYear = fcs.getCurrentYear();

    const moviesData = await Promise.all(
        providers.map(async (provider) => {
            const parsedProviderName = fcs.parseProviderName(
                provider.providerName,
            );
            return fcs.getTopTenMovies(
                provider.providerUrl,
                currentYear,
                parsedProviderName,
            );
        }),
    );
    const parsedMoviesData = fcs.parseMoviesData(moviesData);
    const sortedMoviesData = fcs.sortMoviesByRating(parsedMoviesData);
    const checkedDuplicates = fcs.checkDuplicates(sortedMoviesData);
    await fcs.saveToCsv(checkedDuplicates);
};

main();
