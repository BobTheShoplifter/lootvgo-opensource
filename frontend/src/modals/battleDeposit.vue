<template>
	<v-card class="modal">
		<v-card-title>Deposit vKeys</v-card-title>
		<v-card-text class="number text-center">
			<div class="flex-no-shrink disp-flex flex-column flex-center-y">
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
						v-model="amount"
						hide-details
						:min="1"
						:max="user ? user.keys > 200 ? 200 : user.keys : 200"
						step="1"
					></v-slider>
				</div>

				<p
					class="fw-semibold mt-2"
				>Select the amount of vKeys you wish to turn into Battle Keys. Battle keys are non-refundable and can only be used for case battles.</p>

				<div v-if="user && user.keys < 1" class="red--text mb-2">
					You do not have any vKeys, click
					<a
						@click="$modal.open($root, 'buyKeys', {maxWidth: 450})"
						class="red--text link fw-bold"
						target="_blank"
					>here</a>
					to buy more!
				</div>

				<v-btn
					v-if="!offerID"
					round
					large
					block
					color="primary"
					:loading="loading"
					@click="buy"
					:disabled="user && user.keys < amount || amount < 1"
					class="mx-0 has-glow"
				>
					<span class="mx-2 fw-semibold">Deposit {{amount ? amount : '0'}} vKeys</span>
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
				v-if="!offerID || loading"
				@click="close"
				class="ml-0 mr-1"
			>
				<span class="mx-2 text-uppercase caption fw-bold">Close</span>
			</v-btn>
		</v-card-actions>
	</v-card>
</template>

<script>
import { Errors, RequestStates } from '@/utils'
import { EVENTS } from '@/api/endpoints'

import socket from '@/lib/socket'

export default {
	props: ['close'],
	store: ['config', 'actions', 'state', 'auth'],
	data() {
		return {
			offerID: null,
			amount: 0,
			loading: false,
			eventHandler: null
		}
	},
	beforeDestroy() {
		clearInterval(this.eventHandler)

		socket.removeAllListeners(EVENTS.user.trade)
	},
	mounted() {
		if (this.user) {
			this.actions.user
				.getKeyCount()
				.then(count => (this.user.keys = count))
				.catch(err => {
					this.$toast.open({
						type: 'error',
						text: this.$t(`errors.${Errors[err.message]}`) + ` (${err.message})`
					})
				})

			socket.on(EVENTS.user.trade, trade => {
				if (!this.offerID) return
				if (this.offerID !== trade.offerID) return

				switch (RequestStates[trade.state]) {
					case 'Cancelled':
						this.$toast.open({
							type: 'error',
							text: 'You have cancelled the trade. Please try again.'
						})
						this.offerID = null
						break

					case 'Expired':
						this.$toast.open({
							type: 'error',
							text: 'The trade has expired. Please try again.'
						})
						this.offerID = null
						break

					case 'Invalid':
						this.$toast.open({
							type: 'error',
							text: 'The trade is invalid. Please try again.'
						})
						this.offerID = null
						break

					case 'Declined':
						this.$toast.open({
							type: 'error',
							text: 'The trade was declined. Please try again.'
						})
						this.offerID = null
						break
				}

				if (trade.state > RequestStates.Limbo) {
					this.$toast.open({
						type: 'success',
						text: 'Trade successful, your keys have been deposited!'
					})
					this.user.keyCount += this.amount
					this.close()
				}
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

			if (this.amount > this.user.keys) {
				return this.$toast.open({
					type: 'error',
					text: this.$t('errors.InsufficientBalance')
				})
			}

			this.loading = true

			this.actions.user
				.depositKeys(this.amount)
				.then(resp => {
					this.offerID = resp
					setTimeout(() => this.checkOffer(), 1e3)
				})
				.catch(err => {
					this.$toast.open({
						type: 'error',
						title: "Couldn't Deposit Keys(s)",
						text: this.$t(`errors.${Errors[err.message]}`) + ` (${err.message})`
					})
				})
				.finally(() => {
					this.loading = false
				})
		},
		checkOffer() {

			if (!this.offerID) return

			if (!this.offerID) return
		}
	},
	computed: {
		user() {
			if (this.auth.authenticated) return this.auth.user
			else return null
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

