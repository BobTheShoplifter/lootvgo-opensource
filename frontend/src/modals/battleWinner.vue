<template>
	<v-card class="modal">
		<v-card-title>Congratulations!</v-card-title>
		<v-card-text class="number text-center">
			<p class="body-2 mb-2">
				You just won a case battle! You will receive
				<b
					class="tertiary--text"
				>{{totalItems - (battle.taxedItems ? battle.taxedItems.length : 0)}}</b> items worth
				<b
					class="tertiary--text"
				>${{battle.totalValue ? battle.totalValue - battle.taxed : total | currencyInt}}</b> in a WAX ExpressTrade trade offer.
			</p>

			<b
				class="disp-block danger--text fw-bold mb-3"
			>Make sure to accept this trade offer as soon as possible before it expires!</b>

			<v-btn
				round
				large
				block
				color="tertiary dark--text"
				:href="`https://trade.opskins.com/trade-offers#offer_${battle.winnerOfferID}`"
				target="_blank"
				class="has-glow"
			>
				<span class="mx-2 fw-semibold">Open Trade Offer</span>
			</v-btn>
		</v-card-text>
		<v-card-actions>
			<v-btn small flat @click="close()">Close</v-btn>
		</v-card-actions>
	</v-card>
</template>

<script>
import { Errors } from '@/utils'

export default {
	store: ['actions'],
	props: ['payload', 'close'],
	data() {
		return {
			url: null,
			battle: null
		}
	},
	beforeMount() {
		this.battle = this.payload
		// something went really wrong
		if (!this.battle) return this.close()
	},
	methods: {},
	computed: {
		total() {
			if (!this.battle) return 0

			let total = 0

			for (const key in this.battle.openedCases) {
				if (this.battle.openedCases.hasOwnProperty(key)) {
					const playerCases = this.battle.openedCases[key]
					total += playerCases.reduce((acc, i) => acc + i.item.suggested_price, 0)
				}
			}

			return total
		},
		totalItems() {
			if (!this.battle) return 0

			let total = 0

			for (const key in this.battle.openedCases) {
				if (this.battle.openedCases.hasOwnProperty(key)) {
					const playerCases = this.battle.openedCases[key]
					total += playerCases.length
				}
			}

			return total
		}
	}
}
</script>
