<template>
	<transition name="scaleIn" v-if="loading">
		<div class="disp-flex pa-5 flex-column flex-center">
			<v-progress-circular class="mb-3" indeterminate color="primary" size="50"></v-progress-circular>
			<span class="text-uppercase fw-bold">Loading</span>
		</div>
	</transition>
	<transition name="scale" v-else>
		<v-container>
			<v-card class="history-table mb-3" color="dark">
				<v-card-title>
					<div class>
						<div class>Battles History</div>
						<small
							class="secondary--text number fw-bold text-uppercase"
						>{{battles.length}} entries</small>
					</div>
					<v-spacer></v-spacer>
					<v-text-field
						v-model="search.battles"
						append-icon="search"
						label="Search"
						single-line
						hide-details
					></v-text-field>
				</v-card-title>

				<v-data-table
					disable-initial-sort
					:headers="battleHeaders"
					:items="battles"
					:search="search.battles"
				>
					<template slot="items" slot-scope="props">
						<td class="number caption text-uppercase">
							<span class="fw-semibold">{{props.item.status}}</span>
							<span
								class="fw-semibold"
								v-if="props.item.winnerID"
								:class="props.item.winnerID === user.steamID ? 'success--text' : 'danger--text'"
							>
								-
								{{props.item.winnerID === user.steamID ? 'Won' : 'Lost'}}
							</span>
							<div class="text-faded-5">{{ props.item.id }}</div>
						</td>
						<td class="z-1 cases flex-grow relative">
							<div class="inner disp-flex flex-center-y py-2">
								<div
									class="case text-center fw-bold mr-2"
									v-for="(box, i) in props.item.casesGrouped"
									:key="i"
								>
									<img :title="cases[i].name" :src="cases[i].url" alt="case">
									<div class="relative z-2 number title">x{{box.length}}</div>
								</div>
							</div>
						</td>
						<td class="number">{{ props.item.date | formatDate }}</td>

						<td class="number caption text-faded-5 fw-semibold">{{props.item.itemids}}</td>
						<td
							class="text-xs-right tertiary--text number"
						>${{ props.item.total | currencyInt }}</td>
						<td class="text-xs-right">
							<v-tooltip color="primary" top>
								<v-btn
									slot="activator"
									color="primary"
									small
									class="val ma-0"
									:to="`/battle/${props.item.id}`"
								>
									<fai :icon="['fas', 'eye']"></fai>
								</v-btn>
								<span>View</span>
							</v-tooltip>
						</td>
					</template>
					<v-alert
						slot="no-results"
						:value="true"
						color="error"
						icon="warning"
					>Your search for "{{ search.battles }}" found no results.</v-alert>
					<v-alert
						:value="true"
						color="error"
						icon="warning"
					>No cases found, buy some!</v-alert>
				</v-data-table>
			</v-card>

			<v-card
				class="history-table mb-3"
				color="dark"
				v-for="(box, i) in historyByCase"
				:key="i"
			>
				<v-card-title>
					<div class="disp-flex flex-center-y">
						<img :src="cases[i].url" class="case-icon mr-3" alt="case icon">
						<div>
							<div class>{{cases[i].name}}</div>
							<small
								class="secondary--text number fw-bold text-uppercase"
							>{{box.length}} entries</small>
						</div>
					</div>
					<v-spacer></v-spacer>
					<v-text-field
						v-model="search[i]"
						append-icon="search"
						label="Search"
						single-line
						hide-details
					></v-text-field>
				</v-card-title>

				<v-data-table
					disable-initial-sort
					:headers="caseHeaders"
					:items="box"
					:search="search[i]"
				>
					<template slot="items" slot-scope="props">
						<td class="number">{{ props.item.id }}</td>
						<td
							class="fw-semibold item-name"
							:style="{color: props.item.item.color}"
						>{{ props.item.item.name }}</td>
						<td class="number">{{ props.item.date | formatDate }}</td>
						<td
							class="text-xs-right number"
						>${{ props.item.item.price | currencyInt }}</td>
						<td
							class="text-xs-right number fw-semibold"
							:class="props.item.item.profit < 0 ? 'danger--text' : 'success--text'"
						>
							${{
							props.item.item.profit | currencyInt }}
						</td>
						<td class="text-xs-right">
							<v-tooltip color="primary" top>
								<v-btn
									slot="activator"
									color="primary"
									small
									class="val ma-0 mr-2"
									@click="$modal.open($root, 'inspect', {maxWidth: 400}, props.item.item)"
								>
									<fai :icon="['fas', 'eye']"></fai>
								</v-btn>
								<span>Inspect</span>
							</v-tooltip>
							<v-tooltip color="primary" top>
								<v-btn
									slot="activator"
									color="primary"
									small
									class="val ma-0"
									@click="$modal.open($root, 'share', {maxWidth: 600}, props.item)"
								>
									<fai :icon="['fas', 'share']"></fai>
								</v-btn>
								<span>Share</span>
							</v-tooltip>
						</td>
					</template>
					<v-alert
						slot="no-results"
						:value="true"
						color="error"
						icon="warning"
					>Your search for "{{ search[i] }}" found no results.</v-alert>
					<v-alert
						:value="true"
						color="error"
						icon="warning"
					>No cases found, buy some!</v-alert>
				</v-data-table>
			</v-card>
		</v-container>
	</transition>
</template>

<script>
import { Errors } from '@/utils'

import groupBy from 'lodash-es/groupBy'
import sortBy from 'lodash-es/sortBy'

const BATTLE_STATUSES = {
	1: 'Waiting', // Created and waiting for players
	2: 'Expired', // Created and waiting for players
	3: 'Errored', // Created and waiting for players
	4: 'Cancelled', // Created and waiting for players
	5: 'Processing', // Enough players joined and it's opening the cases
	6: 'Playing', // Cases have been opened and weeeee
	7: 'Finished' // Cases have been opened and weeeee
}

export default {
	name: 'UserHistory',
	store: ['auth', 'actions', 'state'],
	props: ['history'],
	data() {
		return {
			loading: false,
			search: {},
			caseHeaders: [
				{
					text: 'Case ID',
					align: 'left',
					value: 'item.id'
				},
				{
					text: 'Item',
					align: 'left',
					sortable: false,
					value: 'item.name'
				},
				{
					text: 'Date Opened',
					align: 'left',
					// sortable: false,
					value: 'item.data'
				},
				{ text: 'Price', value: 'item.price', align: 'right' },
				{ text: 'Profit', value: 'item.profit', align: 'right' },
				// { text: 'Profit', value: 'item.price' },
				// { text: 'Carbs (g)', value: 'carbs' },
				// { text: 'Protein (g)', value: 'protein' },
				{ text: 'Actions', sortable: false, align: 'right' }
			],
			battleHeaders: [
				{
					text: 'Battle ID',
					sortable: false,
					align: 'left',
					value: 'item.id'
				},
				{
					text: 'Cases',
					align: 'center',
					sortable: false,
					value: 'item.cases'
				},
				{
					text: 'Date Created',
					align: 'left',
					value: 'item.date'
				},

				{
					text: 'Item IDs',
					align: 'left',
					sortable: false,
					value: 'item.itemids'
				},
				{ text: 'Total', value: 'item.total', align: 'right' },
				{ text: 'Actions', sortable: false, align: 'right' }
			],
			battles: []
		}
	},
	beforeMount() {
		window._ = require('lodash-es')
		this.loading = true
		this.actions.user
			.getBattleHistory()
			.then(resp => {
				resp.forEach(i => {
					i.casesGrouped = groupBy(i.cases)
					i.status = BATTLE_STATUSES[i.state]
					i.itemids = ''
					i.total = i.totalValue ? i.totalValue - i.taxed : 0

					for (const player of Object.values(i.openedCases)) {
						if (!i.totalValue) i.total += player.reduce((acc, o) => acc + o.item.suggested_price, 0)
						i.itemids += player.reduce((acc, o) => acc + `#${o.caseID}, `, '')
					}
				})
				this.battles = sortBy(resp, 'date').reverse()
			})
			.catch(err => {
				this.$toast.open({
					type: 'error',
					text: this.$t(`errors.${Errors[err.message]}`) + ` (${err.message})`
				})
			})
			.finally(() => (this.loading = false))

		// for (let i = 0; i < this.state.cases.length; i++) {
		//   const element = this.cases[i]
		//   this.search[i + 1] = ''
		// }
	},
	computed: {
		user() {
			if (this.auth.authenticated) return this.auth.user
			else return null
		},
		cases() {
			return this.state.cases.reduce(function(acc, cur, i) {
				acc[cur.id] = cur
				return acc
			}, {})
		},
		historyByCase() {
			if (!this.history) return null

			let history = sortBy(this.history.filter(i => i.opened), 'date').reverse()

			history.forEach(i => {
				i.date = new Date(i.openDate || i.date).getTime()
				i.item.profit = i.item.price - this.cases[i.caseID].keysPerCase * 250
			})

			return groupBy(history, 'caseID')
		}
	}
}
</script>

<style lang="scss" scoped>
@import '../../styles/variables.scss';

.case-stats {
	img {
		max-width: 200px;
		width: 100%;
	}
}

.cases {
	width: 25%;
	overflow-x: auto;
	.inner {
		min-width: 100px;
		max-width: 1px;
		.case {
			img {
				max-width: 64px;
				margin: -10px 0 -30px 0;
			}
		}
	}
}

.history-table {
	img.case-icon {
		max-width: 64px;
	}

	/deep/ {
		.datatable__actions {
			background-color: $dark !important;
		}
		table {
			background: $darker;

			th {
				font-weight: bold;
				border-bottom: 2px solid $secondary !important;
			}

			.datatable__progress {
				display: none;
			}

			td,
			th {
				vertical-align: middle;
			}

			.item-name {
				font-weight: 600;
			}
		}
	}
}
</style>
