<template>
	<v-card class="modal">
		<v-card-title>Buy vKeys from WAX
			<v-spacer></v-spacer>
			<!-- <div class="dark caption body-2 disp-flex flex-center-y key-count">
        <span class="fw-semibold number" :class="{'danger--text fw-bold': balance < amount * 250}">${{balance |
          currencyInt}}</span>
        <v-btn class="ma-0 ml-1 val" small flat color="primary" target="_blank" href="https://opskins.com/?loc=payments">
          <fai :icon="['fas', 'plus']" class="icon caption"></fai>
        </v-btn>
			</div>-->
		</v-card-title>
		<v-card-text class="number">
			<div class="flex-no-shrink disp-flex flex-column flex-center-y">
				<p>You can buy WAX Keys directly through LootVGO without going to WAX!</p>

				<small class="fw-semibold mb-3">
					Make sure you have at least $2.50 in either your Operation Points balance or WAX balance.
					We cannot combine balances together. Your Operation Points are prioritized.
				</small>

				<v-container fluid>
					<v-layout row wrap v-if="balance !== undefined">
						<v-flex sm12 class="text-center">
							<div class="title number mb-1">{{user.credits.balanceInKeys | numberInt}}</div>
							<div
								class="tertiary--text caption fw-bold text-uppercase"
							>Purchasable Amount</div>
						</v-flex>
					</v-layout>
				</v-container>

				<p
					class="fw-semibold caption mt-2"
				>Please select the amount of keys you wish to buy.</p>

				<div class="mb-2 relative input-ctn">
					<div class="dark disp-flex flex-center-y">
						<fai :icon="['fas', 'key']" class="primary--text ml-3 mr-1"></fai>
						<input
							:disabled="loading"
							class="ma-0 number fw-semibold"
							type="number"
							v-model.number="amount"
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
						v-model.number="amount"
						hide-details
						:min="1"
						:max="100"
						step="1"
					></v-slider>
				</div>

				<div v-if="balance < amount" class="red--text mb-2">
					You do not have enough balance on WAX, click
					<a
						href="https://opskins.com/?loc=payments"
						class="red--text"
						target="_blank"
					>here</a>
					to deposit more!
				</div>

				<v-btn
					round
					large
					block
					color="primary"
					:loading="loading"
					@click="buy"
					:disabled="balance < amount"
					class="mx-0 has-glow"
				>
					<span class="mx-2 fw-semibold">Buy {{amount ? amount : '0'}} vKeys</span>
				</v-btn>
			</div>
		</v-card-text>
		<v-card-actions>
			<v-btn
				round
				color="quaternary"
				small
				v-if="!loading"
				href="https://opskins.com/?app=1912_1&amp;loc=shop_search&amp;max=2.51&amp;sort=lh&amp;type=key"
				target="_blank"
				class="ml-0 mr-1"
			>
				<span class="mx-2 caption fw-semibold">Buy on WAX</span>
			</v-btn>
			<v-btn flat small v-if="!loading" @click="close" class="ml-0 mr-1">
				<span class="mx-2 text-uppercase caption fw-bold">Close</span>
			</v-btn>
		</v-card-actions>
	</v-card>
</template>

<script>
import { Errors } from '@/utils'

import socket from '@/lib/socket'

export default {
	name: 'modalBuyKeys',
	props: ['close'],
	store: ['config', 'actions', 'state', 'auth'],
	data() {
		return {
			amount: 0,
			loading: false
		}
	},
	mounted() {
		if (this.user) {
			this.actions.user
				.getOPBalance()
				.then(resp => (this.user.credits = resp))
				.catch(err => {
					this.$toast.open({
						type: 'error',
						text: this.$t(`errors.${Errors[err.message]}`) + ` (${err.message})`
					})
				})
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

			this.amount = parseInt(this.amount)

			if (this.balance < this.amount) {
				return this.$toast.open({
					type: 'error',
					text: this.$t('errors.InsufficientBalance')
				})
			}

			this.loading = true

			this.actions.user
				.buyKeys(this.amount)
				.then(resp => {
					if (resp.message && resp.message === 105) {
						this.$toast.open({
							type: 'info',
							text: `${
								this.amount
							} key(s) were bought, but couldn't be transferred to ExpressTrade. Please transfer them manually.`
						})
					} else {
						this.$toast.open({
							type: 'success',
							text: `${this.amount} key(s) bought successfully.`
						})
					}

					this.user.keys += this.amount
					this.actions.user.getOPBalance().then(resp => (this.user.credits = resp))

					this.close()
				})
				.catch(err => {
					this.$toast.open({
						type: 'error',
						title: "Couldn't Buy Keys",
						text: this.$t(`errors.${Errors[err.message]}`) + ` (${err.message})`
					})
				})
				.finally(() => {
					this.loading = false
				})
		}
	},
	computed: {
		user() {
			if (this.auth.authenticated) return this.auth.user
			else return null
		},
		balance() {
			if (!this.user) return 0
			if (!Object.keys(this.user.credits).length) return 0
			return this.user.credits.balanceInKeys
		}
	}
}
</script>

<style lang="scss" scoped>
@import '../styles/variables.scss';

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

