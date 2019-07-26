<template>
	<transition name="scaleIn" v-if="loading">
		<div class="disp-flex pa-5 flex-column flex-center">
			<v-progress-circular class="mb-3" indeterminate color="primary" size="50"></v-progress-circular>
			<span class="text-uppercase fw-bold">Loading</span>
		</div>
	</transition>
	<transition name="fade" v-else>
		<v-container class="page-container">
			<p
				class="mb-3 number"
			>Wouldn't it be amazing if you could open more loot by referring your friends and fans to LootVGO? Well your dream just became reality. LootVGO's affiliate system is linked directly with WAX, that means you receive balance automatically when your referrals open cases! That's right, WAX balance you can use everywhere!</p>

			<div class="mb-3">
				<h3 class="primary--text text-uppercase mb-1">So how does it work?</h3>
				<p class="mb-3 number">
					If you haven't already, create a code below. You must also provide your WAX User ID, to find it, click
					<a
						href="https://trade.opskins.com/settings#userId"
						target="_blank"
					>here</a>. You can the copy the referral link and spread it around like butter. Your WAX balance will be credited within 5 minutes of every case opening performed by your affiliates.
				</p>

				<h4 class="primary--text text-uppercase mb-1">How much do I earn?</h4>
				<p
					class="mb-3 number"
				>Every time your affiliates open a case you receive $0.08 into your balance on WAX.com. Thats 30% of our cut!</p>

				<p
					class="mb-3 number"
				>Affiliates currently only count towards regular case openings. Case battles do not count.</p>

				<p
					class="fw-bold danger--text"
				>Your code and Wax ID are permanent, you will not be able to change them. Make sure they're correct.</p>
			</div>

			<div class="mb-3" v-if="stats">
				<h2 class="primary--text text-uppercase mb-4">Your Stats</h2>
				<div class="mb-4 disp-flex flex-around flex-center-y flex-wrap number">
					<div class="text-center">
						<div class="number title">{{stats.usageCount | numberInt}}</div>
						<div class="secondary--text fw-bold text-uppercase">Referees</div>
					</div>
					<div class="text-center">
						<div class="number title">{{stats.caseCount | numberInt}}</div>
						<div class="secondary--text fw-bold text-uppercase">Cases Opened</div>
					</div>
					<div class="text-center">
						<div class="number title">${{stats.revenue | currencyInt}}</div>
						<div class="secondary--text fw-bold text-uppercase">Total Earned</div>
					</div>
				</div>
			</div>

			<div class="pa-3 dark elevation-3 mb-3" v-if="user.ownRef">
				<div class="text-uppercase fw-semibold mb-2">Share your link!</div>
				<div class="disp-flex flex-center-y mb-2 number">
					<v-text-field
						solo-inverted
						class="mr-2 darker"
						id="refCodeCopy"
						:value="`https://lootvgo.com/ref/${user.ownRef}`"
						hide-details
						readonly
						onclick="this.select()"
					></v-text-field>
					<v-btn class="ma-0" large color="primary" @click="copyCode()">Copy</v-btn>
				</div>
			</div>

			<div v-if="!user.ownRef" class="mb-3">
				<h3 class="primary--text text-uppercase mb-2">Set Your Referral Code</h3>
				<div
					class="dark elevation-3 has-shadow pa-3 disp-flex flex-center-y flex-wrap mb-2 number"
				>
					<v-text-field
						solo-inverted
						class="mr-2"
						label="Your Code"
						hide-details
						v-model="inputs.ownRef"
						required
					></v-text-field>
					<v-text-field
						solo-inverted
						type="number"
						class="mr-2"
						label="WAX ID (NOT STEAM)"
						hide-details
						v-model.number="inputs.opID"
						required
					></v-text-field>
					<v-btn
						class="ma-0"
						large
						color="primary"
						@click="createCode()"
						:loading="loading"
						:disabled="!inputs.ownRef || !inputs.opID"
					>Set Code</v-btn>
				</div>
			</div>

			<div
				v-if="user.refCode"
				class="secondary--text text-center fw-semibold mb-3"
			>You were referred by: {{user.refCode}}</div>

			<div v-else class="pa-3 elevation-3 dark mb-3">
				<h3 class="primary--text text-uppercase mb-2">Redeem a Code</h3>
				<div class="disp-flex flex-center-y mb-2 number">
					<v-text-field
						solo-inverted
						class="mr-2"
						label="Your Code"
						hide-details
						v-model="inputs.redeemCode"
						required
					></v-text-field>
					<v-btn
						class="ma-0"
						large
						color="primary"
						@click="applyCode()"
						:loading="loading"
						:disabled="!inputs.redeemCode"
					>Redeem Code</v-btn>
				</div>
			</div>
		</v-container>
	</transition>
</template>

<script>
import { Errors } from '@/utils'
import CountTo from 'vue-count-to'

export default {
	name: 'UserAffiliates',
	store: ['auth', 'actions', 'state'],
	data() {
		return {
			loading: false,
			inputs: {
				ownRef: null,
				opID: null,
				redeemCode: null
			},
			stats: null
		}
	},
	beforeMount() {
		// loading
		if (this.user.ownRef) this.getStats()
	},
	methods: {
		getStats() {
			if (this.loading) return
			this.loading = true

			this.actions.ref
				.getStats(this.user.ownRef)
				.then(resp => (this.stats = resp))
				.catch(err => {
					this.$toast.open({
						type: 'error',
						title: "Couldn't Get Stats",
						text: this.$t(`errors.${Errors[err.message]}`) + ` (${err.message})`
					})
				})
				.finally(() => (this.loading = false))
		},
		createCode() {
			if (this.loading) return

			// if (this.inputs.opID.toString().length > 16 || this.inputs.opID.toString() === this.user.steamID) {
			//   return this.$toast.open({
			//     type: 'error',
			//     text: 'This looks like a SteamID64, make sure its a WAX User ID.',
			//   })
			// }

			this.loading = true

			this.actions.ref
				.createCode(this.inputs.ownRef.toLowerCase(), this.inputs.opID)
				.then(() => {
					this.user.ownRef = this.inputs.ownRef

					this.$toast.open({
						type: 'success',
						text: 'Your code was set successfully.'
					})
				})
				.catch(err => {
					this.$toast.open({
						type: 'error',
						title: "Couldn't Create Code",
						text: this.$t(`errors.${Errors[err.message]}`) + ` (${err.message})`
					})
				})
				.finally(() => (this.loading = false))
		},
		applyCode() {
			if (this.loading) return
			this.loading = true

			this.actions.ref
				.applyCode(this.inputs.redeemCode.toLowerCase())
				.then(() => {
					this.user.refCode = this.inputs.redeemCode

					this.$toast.open({
						type: 'success',
						text: 'You redeemed code: ' + this.inputs.redeemCode
					})
				})
				.catch(err => {
					this.$toast.open({
						type: 'error',
						title: "Couldn't Create Code",
						text: this.$t(`errors.${Errors[err.message]}`) + ` (${err.message})`
					})
				})
				.finally(() => (this.loading = false))
		},
		copyCode() {
			document.getElementById('refCodeCopy').select()
			document.execCommand('copy')

			this.$toast.open({
				text: 'Referral link copied!'
			})
		}
	},
	computed: {
		user() {
			if (this.auth.authenticated) return this.auth.user
			else return null
		}
	},
	components: {
		CountTo
	}
}
</script>

<style lang="scss" scoped>
@import '../../styles/variables.scss';

.page-container {
	max-width: 700px;
}
</style>
