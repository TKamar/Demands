import { Location } from "../location/location.model";


export enum ProjectType {
    Emergency,
    Semiannual,
};

export enum Median {
    H1,
    H2,
};

export enum Priority {
    P1 = 'P1',
    P2 = 'P2',
    P3 = 'P3',
}

export interface Project {
    name: string;
    purpose: string;
    relatedTo?: string;
    type: ProjectType;
    kind: string;
    location: Location;
    year?: number;
    median?: Median;
    priority?: Priority;
    centerName?: string;
    branchName?: string;
    sectionName?: string;
    emergencyOptionName?: string;
}