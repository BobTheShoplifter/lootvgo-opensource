<template>
	<v-card class="modal">
		<v-card-title>Buy {{vcase.name}}</v-card-title>
		<v-card-text class="number text-center">
			<div class="flex-no-shrink disp-flex flex-column flex-center-y">
				<div
					class="fw-bold caption mb-2"
				>LootVGO now combines your keys and WAX balances to buy keys and cases. Operation Points are prioritized unless insufficient.</div>

				<img :src="vcase.url" alt="case">

				<div class="mb-2 relative input-ctn">
					<div class="dark disp-flex flex-center-y">
						<fai :icon="['far', 'box-open']" class="primary--text ml-3 mr-1"></fai>
						<input
							:disabled="loading"
							class="ma-0 number fw-semibold"
							type="number"
							v-model.number="amount"
							:min="min"
							placeholder="Amount"
						>
						<v-btn
							small
							color="secondary"
							@click="amount++"
							class="ma-0 mr-1 val"
							:disabled="loading"
						>
							<fai :icon="['fas','plus']"></fai>
						</v-btn>
						<v-btn
							small
							color="secondary"
							@click="amount--"
							class="ma-0 mx-1 val"
							:disabled="loading"
						>
							<fai :icon="['fas','minus']"></fai>
						</v-btn>
					</div>
					<v-slider
						class="pa-0"
						:disabled="loading"
						v-model="amount"
						hide-details
						:min="min"
						:max="potentialCases > 0 ? potentialCases : 200"
						step="1"
					></v-slider>
				</div>

				<p class="fw-semibold mt-2">
					This case contains
					<span
						class="primary--text"
					>{{vcase.items.length}} unique skins</span>,
					<span class="primary--text">{{items.knives.length / 5}} knives</span> and
					<span class="primary--text">{{items.weapons.length / 5}} weapons</span>.
				</p>

				<div
					class="fw-semibold warning--text my-2"
					v-if="vcase.keysPerCase > 1 || balanceSpent"
				>
					Using
					<span v-if="keysSpent">{{keysSpent}} keys</span>
					<span v-if="keysSpent && balanceSpent">and buying</span>
					<span v-if="balanceSpent">{{balanceSpent}} keys</span>
					for {{amount}} case(s).
				</div>

				<v-btn
					v-if="!offerID || accepted"
					round
					large
					block
					color="primary"
					:loading="loading"
					@click="buy"
					:disabled="potentialCases < amount"
					class="mx-0 has-glow"
				>
					<span class="mx-2 fw-semibold">Purchase {{amount}} case(s)</span>
				</v-btn>
				<v-btn
					v-else
					round
					large
					block
					color="tertiary dark--text"
					:href="`https://trade.opskins.com/trade-offers#offer_${offerID}`"
					target="_blank"
					class="mx-0 has-glow"
				>
					<span class="mx-2 fw-semibold">Open Trade Offer</span>
				</v-btn>
			</div>
		</v-card-text>
		<v-card-actions>
			<v-btn
				flat
				small
				v-if="!offerID || !loading"
				@click="close"
				class="ml-0 mr-1"
			>
				<span class="mx-2 text-uppercase caption fw-bold">Close</span>
			</v-btn>
			<v-btn
				flat
				small
				v-if="!offerID || !loading"
				color="tertiary"
				active-class
				:to="`/case/${vcase.id}`"
				@click="close"
				class="mx-0"
			>
				<span class="mx-2 text-uppercase caption fw-bold">View Items</span>
			</v-btn>
		</v-card-actions>
	</v-card>
</template>

<script>
import { Errors, RequestStates, parseCase } from '@/utils'

import sortBy from 'lodash-es/sortBy'

const ITEM_WEAR = {
	0: ['Factory New', 'FN'],
	1: ['Minimal Wear', 'MW'],
	2: ['Field-Tested', 'FT'],
	3: ['Well-Worn', 'WW'],
	4: ['Battle-Scarred', 'BS']
}

export default {
	props: ['payload', 'close'],
	store: ['config', 'actions', 'state', 'auth'],
	data() {
		return {
			offerID: null,
			accepted: false,
			amount: 0,
			min: 0,
			vcase: this.payload,
			loading: false,
			eventHandler: null
		}
	},
	beforeDestroy() {
		clearInterval(this.eventHandler)
	},
	mounted() {
		this.amount = this.min = this.config.minimumVolume || 1

		if (this.user) {
			this.actions.user.getKeyCount().then(count => (this.user.keys = parseInt(count)))
			this.actions.user.getOPBalance().then(resp => (this.user.credits = resp))
		}
	},
	watch: {
		'state.pendingCases': {
			handler(val) {
				if (!this.offerID) return

				let currentOffer = val.find(i => i.offerID === this.offerID)
				if (!currentOffer) return

				switch (RequestStates[currentOffer.state]) {
					case 'Cancelled':
						this.$toast.open({
							type: 'error',
							text: 'You have cancelled the trade. Please try again.'
						})
						this.$ga.query('ecommerce:clear')
						this.offerID = null
						this.loading = false
						break

					case 'Expired':
						this.$toast.open({
							type: 'error',
							text: 'The trade has expired. Please try again.'
						})
						this.$ga.query('ecommerce:clear')
						this.offerID = null
						this.loading = false
						break

					case 'Limbo':
						this.$toast.open({
							type: 'warning',
							text: 'Your trade may be errored, we are retrying...'
						})
						break

					case 'Invalid':
						this.$toast.open({
							type: 'error',
							text: 'The trade is invalid. Please try again.'
						})
						this.$ga.query('ecommerce:clear')
						this.offerID = null
						this.loading = false
						break

					case 'Declined':
						this.$toast.open({
							type: 'error',
							text: 'The trade was declined. Please try again.'
						})
						this.$ga.query('ecommerce:clear')
						this.offerID = null
						this.loading = false
						break
				}

				if (currentOffer.state > RequestStates.Limbo) {
					this.$ga.ecommerce.send()

					this.$toast.open({
						type: 'success',
						text: 'Trade successful, your case(s) are being processed...'
					})

					this.actions.user.getKeyCount().then(count => (this.user.keys = parseInt(count)))
					this.actions.user.getOPBalance().then(resp => (this.user.credits = resp))

					if (window.fbq) window.fbq('track', 'CaseOpen')

					this.close()
				}
			},
			deep: true
		}
	},
	methods: {
		buy() {
			if (this.loading) return

			if (!this.user) {
				return this.$toast.open({
					type: 'error',
					text: this.$t('errors.NotLoggedIn')
				})
			}

			this.loading = true

			this.actions.user
				.requestCases(this.vcase.id, this.amount)
				.then(resp => {
					this.offerID = resp.offerID
					this.accepted = resp.accepted

					// analytics
					this.$ga.ecommerce.addTransaction({
						id: resp, // Transaction ID. Required.
						revenue: this.amount * 0.13,
						shipping: 0,
						tax: 0
					})

					this.$ga.ecommerce.addItem({
						id: resp, // Transaction ID. Required.
						name: `Case ${this.vcase.id}`, // Product name. Required.
						sku: `CASE-${this.vcase.id}`, // SKU/code.
						category: 'cases', // Category or variation.
						price: 0.13, // Unit price.
						quantity: this.amount // Quantity.
					})

					setTimeout(() => this.checkOffer(), 1e3)
				})
				.catch(err => {
					this.loading = false
					this.$toast.open({
						type: 'error',
						title: "Couldn't Buy Case(s)",
						text: this.$t(`errors.${Errors[err.message]}`) + ` (${err.message})`
					})
				})
		},
		checkOffer() {
			if (!this.offerID) return

			this.actions.user
				.getCases()
				.then(resp => (this.state.pendingCases = resp.map(i => parseCase(i))))
				.catch(err => {
					this.$toast.open({
						type: 'error',
						title: "Couldn't Get Trade Status",
						text: this.$t(`errors.${Errors[err.message]}`) + ` (${err.message})`
					})

					// retry
					setTimeout(this.checkOffer, 5000)
				})
		}
	},
	computed: {
		user() {
			if (this.auth.authenticated) return this.auth.user
			else return null
		},
		keysSpent() {
			if (!this.user) return 0
			let keysRequired = this.amount * this.vcase.keysPerCase
			return keysRequired >= this.user.keys ? this.user.keys : keysRequired
		},
		balanceSpent() {
			if (!this.user) return 0
			let keysRequired = this.amount * this.vcase.keysPerCase
			return keysRequired - this.keysSpent
		},
		potentialCases() {
			if (!this.user) return 0
			return Math.floor(this.potentialKeys / this.vcase.keysPerCase)
		},
		potentialKeys() {
			if (!this.user) return 0
			return this.user.keys + this.balance
		},
		balance() {
			if (!this.user) return {}
			if (!Object.keys(this.user.credits).length) return {}
			return this.user.credits.balanceInKeys
		},
		items() {
			let items = []

			this.vcase.items.forEach((itemGroup, groupId) => {
				for (const key in itemGroup) {
					if (itemGroup.hasOwnProperty(key)) {
						const item = itemGroup[key]

						// get skin
						var regex = item.name.match(/(StatTrak™ )?(.+) \| (.+) \((.+)\)$/)
						if (regex && regex[3]) {
							item.skin = regex[3]
						}

						items.push({
							sku: groupId,
							id: `${groupId}+${key}`,
							name: item.name,
							skin: item.skin,
							type: (item.type && item.type.toLowerCase()) || null,
							rarity: (item.rarity && item.rarity.toLowerCase()) || null,
							category: (item.category && item.category.toLowerCase()) || null,
							wear: ITEM_WEAR[key - 1][0],
							wearShort: ITEM_WEAR[key - 1][1],
							color: item.color,
							url: item.image['300px'],
							price: item.suggested_price
						})
					}
				}
			})

			return {
				all: sortBy(items, 'price').reverse(),
				lowest: sortBy(items, 'price')[0],
				highest: sortBy(items, 'price').reverse()[0],
				knives: sortBy(items.filter(i => i.type === 'knife'), 'price').reverse(),
				weapons: sortBy(items.filter(i => i.type !== 'knife'), 'price').reverse()
			}
		}
	}
}

function openInNewTab(url) {
	var win = window.open(url, '_blank')
	win.focus()
}
</script>

<style lang="scss" scoped>
@import '../styles/variables.scss';

img {
	margin-top: -30px;
	margin-bottom: -30px;
	width: 100%;
	max-width: 250px;
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

