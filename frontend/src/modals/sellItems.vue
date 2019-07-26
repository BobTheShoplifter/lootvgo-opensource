<template>
	<v-card class="modal">
		<v-card-title>Instant-Sell Items</v-card-title>
		<v-card-text class="number">
			<div class="flex-no-shrink disp-flex flex-column">
				<p class="mb-1">
					Any items from cases you bought in the last 60 minutes can be sold back to WAX instantly &mdash; directly
					through LootVGO.
				</p>
				<small class="fw-semibold tertiary--text mb-3">
					Items are sold at their suggested price
					<b>minus</b> the WAX 10% fee. The item prices are
					adjusted
					accordingly below.
				</small>

				<v-container fluid class="pa-0 mb-3">
					<v-layout row wrap>
						<v-flex class="inventory disp-flex flex-wrap" v-if="!!items.length">
							<div class="disp-flex flex-center-y flex-between mb-3 flex-grow">
								<span>Select up to 100 items below.</span>
								<v-btn
									@click="selectAll"
									flat
									color="tertiary"
									small
									class="caption ma-0"
								>Select All</v-btn>
							</div>
							<inventory :items="items"></inventory>
						</v-flex>
						<v-flex v-else class="text-center">
							<h4 class="fw-semibold text-uppercase text-faded-5 text-center">
								No items eligible for
								instant-sell.
							</h4>
						</v-flex>
					</v-layout>
				</v-container>

				<v-container fluid>
					<v-layout row wrap v-if="!!items.length">
						<v-flex md6 sm12 class="text-center">
							<div class="title number mb-1">{{selected.length}}/100</div>
							<div class="tertiary--text caption fw-bold text-uppercase">Items Selected</div>
						</v-flex>
						<v-flex md6 sm12 class="text-center">
							<div class="title number mb-1">${{total | currencyInt}}</div>
							<div class="tertiary--text caption fw-bold text-uppercase">Total</div>
						</v-flex>
					</v-layout>
				</v-container>

				<v-btn
					round
					large
					block
					color="primary"
					:loading="loading"
					@click="sell"
					:disabled="!selected.length || selected.length > 100"
					class="mx-0 has-glow"
				>
					<span class="mx-2 fw-semibold">Sell {{selected.length}} item(s)</span>
				</v-btn>
			</div>
		</v-card-text>
		<v-card-actions>
			<v-btn flat small v-if="!loading" @click="close" class="ml-0 mr-1">
				<span class="mx-2 text-uppercase caption fw-bold">Close</span>
			</v-btn>
		</v-card-actions>
	</v-card>
</template>

<script>
const SELL_TIME = 60

import { Errors } from '@/utils'
import Inventory from '@/components/inventory'
import sortBy from 'lodash-es/sortBy'

import socket from '@/lib/socket'

export default {
	name: 'modalSellItems',
	props: ['close'],
	store: ['config', 'actions', 'state', 'auth'],
	components: {
		Inventory
	},
	data() {
		return {
			items: [],
			soldItems: [],
			loading: false
		}
	},
	mounted() {
		setTimeout(() => {
			this.items = sortBy(
				this.state.openedCases
					.filter(i => {
						if (!i.item) return false
						if (i.status !== 'opened') return false
						if (this.soldItems.includes(i.item.id)) return false

						let caseDate = new Date(i.item.instant_sell_expires).getTime()
						if (caseDate < Date.now()) return false

						return true
					})
					.map(i => {
						const obj = {
							...i.item,
							price: i.item.instant_sell_price
							// sold: this.soldItems.includes(i.item.id)
						}
						return obj
					}),
				'price'
			).reverse()
		}, 300)

		this.soldItems = this.$ls.get('soldItems') || []
	},
	methods: {
		sell() {
			if (this.loading) return

			if (!this.user) {
				return this.$toast.open({
					type: 'error',
					text: this.$t('errors.NotLoggedIn')
				})
			}

			this.loading = true

			this.actions.user
				.sellItems(this.selected.map(i => i.id))
				.then(resp => {
					this.$toast.open({
						type: 'success',
						text: `Sold ${this.selected.length} item(s) for $${this.$options.filters.currencyInt(this.total)}`
					})

					this.soldItems = [...this.soldItems, ...this.selected.map(i => i.id)]
					this.$ls.set('soldItems', this.soldItems)
					this.actions.user.getOPBalance().then(resp => (this.user.credits = resp))
					this.close()
				})
				.catch(err => {
					this.$toast.open({
						type: 'error',
						title: "Couldn't Sell Items",
						text: this.$t(`errors.${Errors[err.message]}`) + ` (${err.message})`
					})
				})
				.finally(() => {
					this.loading = false
				})
		},
		selectAll() {
			this.items.forEach((item, i) => {
				if (i >= 100) return
				this.$set(item, 'selected', !item.selected)
			})
		}
	},
	computed: {
		user() {
			if (this.auth.authenticated) return this.auth.user
			else return null
		},
		selected() {
			return this.items.filter(i => i.selected)
		},
		total() {
			return this.selected.reduce((acc, i) => acc + i.price, 0)
		}
	}
}
</script>

<style lang="scss" scoped>
@import '../styles/variables.scss';

.op-icon {
	fill: $primary;
	width: 16px;
	vertical-align: top;
}

.input-ctn {
	z-index: 3;

	> .dark {
		border-radius: 3px;
	}

	.btn.val {
		min-width: unset;
	}
}

.inventory-ctn {
	width: 100%;
	max-height: 350px;
}

input:active,
input:focus {
	outline: none;
}

textarea,
input {
	max-width: 100px;
	padding: 8px;
}
</style>

