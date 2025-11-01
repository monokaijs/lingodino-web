import {BaseRepository} from "@/lib/services/db/repository";
import dbConnect from "@/lib/services/db/client";
import {Schemas} from "@/lib/services/db/schemas";
import {User} from "@/lib/types/models/user";
import {UserSchema} from "@/lib/services/db/schemas/user";
import {SystemPreference} from "@/lib/types/models/system-preference";
import {SystemPreferenceSchema} from "@/lib/services/db/schemas/systemPreference";


class DBService {
  user: BaseRepository<User>;
  systemPreference: BaseRepository<SystemPreference>;

  constructor() {
    this.user = new BaseRepository<User>(Schemas.User, UserSchema);
    this.systemPreference = new BaseRepository<SystemPreference>(Schemas.SystemPreference, SystemPreferenceSchema);
  }

  connect() {
    return dbConnect();
  }
}

export const dbService = new DBService();
