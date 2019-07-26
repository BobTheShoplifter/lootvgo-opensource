const Scheduler = require('node-schedule');

const db = require('../rethinkDB');

class Tasker {

	constructor(TradeBot) {
		this.TradeAPI = TradeBot;
		this.DB = db;
		this.Scheduler = Scheduler;

		this._updateCasesTasker();
		this.buildCases();
	}

	async _updateCasesTasker() {
		let rule = new this.Scheduler.RecurrenceRule();
		rule.minute = 30;

		this.Scheduler.scheduleJob(rule, async () => {
			try {
				console.log('Updating Case Data!');
				await this.buildCases();
				console.log('Completed Case Data Update!');
			} catch (e) {
				console.error(`Error Updating cases: ${e}`);
			}
		})
	}

	async buildCases(){
		try {
			const caseSchemas = await this.TradeAPI.getCaseSchema();
			let caseSchemaArray = [];
			for (let box of caseSchemas) {
				caseSchemaArray.push(box.id);
				box.items = await this.TradeAPI.getItems(box.skus, box.id, box.flags.VGO_CASE);
				box.schemaID = box.id;
				box.disabled = false;
				delete box.skus;
				await this.DB.r.table('boxes').insert(box, {conflict: 'update'});
			}

			await this.DB.r.table('boxes').filter(boxDb => {return this.DB.r.expr(caseSchemaArray).contains(boxDb('schemaID')).not()}).update({disabled: true}).run();

			console.log('Completed Case Update!')
		} catch (e) {
			console.error(e);
		}
	}
}

module.exports = Tasker;