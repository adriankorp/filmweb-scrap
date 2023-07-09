export interface Movie {
    title: string;
    rating: string;
    providerName: string;
}

export interface ParsedMovie {
    title: string;
    rating: string;
    providerName: string;
    floatRating: number;
}

export interface Provider {
    providerName: string;
    providerUrl: string;
}
