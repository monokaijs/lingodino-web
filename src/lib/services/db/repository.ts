import mongoose, {
  FilterQuery,
  PaginateModel,
  PaginateOptions,
  PipelineStage,
  ProjectionType,
  QueryOptions, Types,
  UpdateQuery,
} from 'mongoose';

export interface MixedModel<T> extends PaginateModel<T> {

}


export class BaseRepository<T> {
  _model: MixedModel<T>;

  constructor(name: string, schema: mongoose.Schema<T>) {
    this._model = mongoose.models[name] as MixedModel<T> || mongoose.model<T>(name, schema) as MixedModel<T>;
  }

  create(item: Omit<T, '_id'>) {
    return this._model.create(item);
  }

  insertMany(docs: Array<Omit<T, '_id'>>) {
    return this._model.insertMany(docs);
  }

  findOne(filter: FilterQuery<T>, projection?: ProjectionType<T>, options?: QueryOptions<T>) {
    return this._model.findOne(this.processFilter(filter), projection, options);
  }

  exists(filter: FilterQuery<T>) {
    return this._model.exists(this.processFilter(filter));
  }

  findOneAndUpdate(filter: FilterQuery<T>, update?: UpdateQuery<T>, options?: QueryOptions<T>) {
    return this._model.findOneAndUpdate(filter, update, options);
  }

  paginate(filter: FilterQuery<T>, options?: PaginateOptions) {
    return this._model.paginate(this.processFilter(filter), options);
  }

  find(filter: FilterQuery<T>, projection?: ProjectionType<T>, options?: QueryOptions<T>) {
    return this._model.find(this.processFilter(filter), projection, options);
  }

  aggregate(pipeline?: PipelineStage[]) {
    return this._model.aggregate(pipeline);
  }

  update(filter: FilterQuery<T>, update?: UpdateQuery<T>, options?: QueryOptions<T>) {
    return this._model.findOneAndUpdate(this.processFilter(filter), update, options);
  }

  deleteOne(id: string | Types.ObjectId) {
    return this._model.deleteOne({_id: id});
  }

  delete(filter: FilterQuery<T>, options?: QueryOptions<T>) {
    return this._model.findOneAndDelete(this.processFilter(filter), options);
  }

  count(filter: FilterQuery<T>) {
    return this._model.countDocuments(this.processFilter(filter));
  }

  findById(_id: string) {
    return this._model.findById(_id);
  }

  private processFilter(filter: FilterQuery<T>) {
    const processedFilter: any = {};
    for (let key in filter) {
      const value = filter[key];
      if (value !== undefined && value !== null) {
        processedFilter[key] = value;
      }
    }
    return processedFilter as FilterQuery<T>;
  }

}
