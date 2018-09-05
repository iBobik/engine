import PredicateFactory from "../../acl/PredicateFactory";
import Mapper from "./Mapper";
import { Acl, Model } from 'cms-common'
import KnexConnection from "../../core/knex/KnexConnection";
import SelectBuilderFactory from "./select/SelectBuilderFactory";
import InsertBuilderFactory from "./insert/InsertBuilderFactory";
import UpdateBuilderFactory from "./update/UpdateBuilderFactory";
import UniqueWhereExpander from "../graphQlResolver/UniqueWhereExpander";

class MapperRunner {
	constructor(
		private readonly schema: Model.Schema,
		private readonly predicateFactory: PredicateFactory,
		private readonly selectBuilderFactory: SelectBuilderFactory,
		private readonly insertBuilderFactory: InsertBuilderFactory,
		private readonly updateBuilderFactory: UpdateBuilderFactory,
		private readonly uniqueWhereExpander: UniqueWhereExpander,
	) {
	}

	public run(db: KnexConnection, variables: Acl.VariablesMap, cb: (mapper: Mapper) => void) {
		return db.wrapper().transaction(trx => {
			const mapper = new Mapper(
				this.schema,
				trx,
				variables,
				this.predicateFactory,
				this.selectBuilderFactory,
				this.insertBuilderFactory,
				this.updateBuilderFactory,
				this.uniqueWhereExpander,
			)
			return cb(mapper)
		})
	}
}

export default MapperRunner
