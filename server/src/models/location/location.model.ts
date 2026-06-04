import { Base } from "./base.model";
import { Environment } from "./environment.model";
import { Network } from "./network.model";
import { Cluster } from "./cluster.model";

export interface Location {
    id: number;
    base: Base;
    environment: Environment;
    network: Network;
    cluster: Cluster;
}