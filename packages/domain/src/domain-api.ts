import { HttpApi } from "@effect/platform";
import { HealthGroup } from "./contracts/HealthContract.js";
import { AuthGroup } from "./contracts/AuthContract.js";

export class DomainApi extends HttpApi.make("DomainApi").add(HealthGroup).add(AuthGroup) {}
