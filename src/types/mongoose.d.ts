// Mongoose type declarations to fix model method call issues
declare module 'mongoose' {
  interface Model<T, TQueryHelpers = any, TInstanceMethods = any, TVirtuals = any, THydratedDocumentType = any, TSchema = any> {
    find(filter?: any): any;
    findOne(filter?: any): any;
    findById(id: any): any;
    findByIdAndUpdate(id: any, update: any, options?: any): any;
    findOneAndUpdate(filter: any, update: any, options?: any): any;
    findOneAndDelete(filter: any): any;
    create(doc: any): any;
    countDocuments(filter?: any): any;
    deleteMany(filter?: any): any;
    deleteOne(filter?: any): any;
    updateMany(filter: any, update: any, options?: any): any;
    updateOne(filter: any, update: any, options?: any): any;
  }
}
