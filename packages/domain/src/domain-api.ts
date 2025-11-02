import { HttpApi } from "@effect/platform";
import { HealthGroup } from "./contracts/HealthContract.js";
import { AuthGroup } from "./contracts/AuthContract.js";
import { UsersGroup } from "./contracts/UsersContract.js";
import { FriendsGroup } from "./contracts/FriendsContract.js";
import { AssetsGroup } from "./contracts/AssetsContract.js";

export class DomainApi extends HttpApi.make("DomainApi")
  .add(HealthGroup)
  .add(AuthGroup)
  .add(UsersGroup)
  .add(FriendsGroup)
  .add(AssetsGroup) {}
