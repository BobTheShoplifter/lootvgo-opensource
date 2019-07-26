<template>
	<transition name="scaleIn">
		<v-app dark>
			<v-toolbar
				class="navbar"
				color="dark"
				clipped-left
				clipped-right
				prominent
				app
			>
				<router-link
					to="/"
					tag="a"
					class="branding ml-0 disp-flex flex-center py-3"
					:style="{width: `${sidebarNavWidth}px`}"
				>
					<div class="logo-container default size-3x">
						<svg
							v-html="require('@/img/logo/logo.svg')"
							xmlns="http://www.w3.org/2000/svg"
							preserveAspectRatio="xMinYMin meet"
							viewBox="0 0 100 20"
						></svg>
					</div>
				</router-link>

				<v-toolbar-items class="text-uppercase fw-bold">
					<v-btn flat to="/">Cases</v-btn>
					<v-btn flat to="/battles">Battles</v-btn>
					<v-btn
						v-if="user"
						flat
						@click="$modal.open($root, 'sellItems', {maxWidth: 600})"
						target="_blank"
					>Sell</v-btn>
					<v-btn flat to="/user/me" v-if="user">Account</v-btn>
					<!-- <v-btn flat to="/help">Help</v-btn> -->
				</v-toolbar-items>

				<v-spacer></v-spacer>
				<div class="collapse-mobile disp-flex flex-center">
					<div class="darker disp-flex flex-center-y key-count mr-3" v-if="user">
						<span class="relative mx-3 number body-2 mb-1">
							<fai
								:icon="['fas', 'key']"
								class="icon caption key-icon mr-2 primary--text text-faded-5"
								size="sm"
							></fai>
							<fai
								:icon="['fas', 'sync-alt']"
								class="icon caption refresh-btn absolute secondary--text"
								size="sm"
								@click="refreshKeycount"
								:spin="loadingKeys"
							></fai>
							<span class="fw-semibold number">{{user.keys}}</span>
						</span>
						<v-btn
							class="ml-0 val"
							small
							color="primary"
							@click="$modal.open($root, 'buyKeys', {maxWidth: 450})"
						>
							<fai :icon="['fas', 'plus']" class="mx-1 icon caption"></fai>
						</v-btn>
					</div>

					<div class="darker disp-flex flex-center-y key-count mr-3" v-if="user">
						<span class="relative mx-3 number body-2 mb-1">
							<fai
								:icon="['fas', 'swords']"
								class="icon caption key-icon mr-2 primary--text text-faded-5"
								size="sm"
							></fai>
							<fai
								:icon="['fas', 'sync-alt']"
								class="icon caption refresh-btn absolute secondary--text"
								size="sm"
								@click="refreshKeycount"
								:spin="loadingKeys"
							></fai>
							<span class="fw-semibold number">{{user.keyCount}}</span>
						</span>
						<v-btn
							class="ml-0 val"
							small
							color="primary"
							@click="$modal.open($root, 'battleDeposit', {maxWidth: 450})"
						>
							<fai :icon="['fas', 'plus']" class="mx-1 icon caption"></fai>
						</v-btn>
					</div>

					<div
						class="mr-3 text-center"
						v-if="user && user.credits && user.credits.balanceInKeys !== undefined"
					>
						<div class="number subheading">{{user.credits.balanceInKeys | numberInt}}</div>
						<div
							class="caption fw-bold text-uppercase number tertiary--text"
						>Purchasable Keys</div>
						<!-- <span class="relative mx-3 number body-2 mb-1">
              <fai :icon="['fas', 'dollar']" class="icon caption key-icon mr-2 primary--text text-faded-5" size="sm"></fai>
              <fai :icon="['fas', 'sync-alt']" class="icon caption refresh-btn absolute secondary--text" size="sm" @click="refreshKeycount" :spin="loadingKeys"></fai>
						</span>-->
						<!-- <v-btn class="ml-0 val" small color="primary" @click="$modal.open($root, 'buyKeys', {maxWidth: 450})">
              <span class="mx-1 text-uppercase fw-bold caption">Deposit</span>
              <fai :icon="['fas', 'plus']" class="mx-1 icon caption"></fai>
						</v-btn>-->
					</div>

					<!-- <noti-bell class="mr-3" :data="self.notifications" align="left"></noti-bell> -->
					<volume-control class="mr-3"></volume-control>

					<v-menu offset-y left attach>
						<user slot="activator"></user>
						<v-list class="dark" dense v-if="user">
							<v-list-tile @click="$modal.open($root, 'settings')">
								<v-list-tile-title>
									<span class="icon mr-1">
										<fai :icon="['far', 'cog']"></fai>
									</span>
									{{$t('navbar.user.settings')}}
								</v-list-tile-title>
							</v-list-tile>

							<v-list-tile href="/logout">
								<v-list-tile-title>
									<span class="icon mr-1">
										<fai :icon="['fal', 'sign-out']"></fai>
									</span>
									{{$t('navbar.user.logout')}}
								</v-list-tile-title>
							</v-list-tile>

							<v-list-tile
								@click="$modal.open($root, 'admin', {maxWidth: 800})"
								class="danger"
								v-if="user && user.rank === 1"
							>
								<v-list-tile-title>
									<span class="icon mr-1">
										<fai :icon="['far', 'cog']"></fai>
									</span>
									Admin Panel
								</v-list-tile-title>
							</v-list-tile>
						</v-list>
					</v-menu>
				</div>
			</v-toolbar>

			<v-navigation-drawer
				class="dark sidebar stats pb-0"
				:width="sidebarNavWidth"
				v-model="self.toggles.sidebarNav"
				left
				clipped
				floating
				app
			>
				<div class="toggle text-center">
					<div class="mobile-close fw-bold text-uppercase">Close</div>
					<div
						class="button"
						@click="self.toggles.sidebarNav = !self.toggles.sidebarNav"
						:class="{closed: !self.toggles.sidebarNav}"
					></div>
				</div>

				<div class="history">
					<!-- <div class="header py-2 caption text-center text-uppercase fw-bold primary--text">Recent Winners</div> -->
					<div class="list pa-0">
						<transition-group name="insert" mode="out-in">
							<v-card
								v-for="listing in recentWinners"
								:key="listing.id"
								class="listing pa-2 disp-flex flex-center-y"
								:style="{borderColor: listing.battle ? 'gold' : listing.item.color}"
							>
								<img
									v-if="listing.item"
									:src="listing.item.url"
									class="item mr-3 pa-2"
									alt="item img"
									@click="inspect(listing.item)"
								>
								<img
									v-else
									src="/static/img/swords.png"
									class="item battle mr-3"
									alt="item img"
								>
								<div
									v-if="listing.item"
									class="price title fw-semibold number"
								>${{listing.item.price | currencyInt}}</div>
								<div class="meta">
									<div
										class="fw-semibold text-uppercase mb-1 item-name"
										:style="{color: listing.battle ? 'gold' : listing.item.color}"
									>
										<span
											v-if="listing.battle"
											class="number"
										>${{listing.battle.total | currencyInt}}</span>
										<span v-if="listing.item">{{listing.item.skin || listing.item.name}}</span>
										<span
											v-if="listing.item"
											class="wear fw-bold text-faded-5"
										>{{listing.item.wearShort}}</span>
									</div>
									<a
										class="user text-faded-5 disp-flex flex-center-y"
										:href="'https://steamcommunity.com/profiles/'+listing.user.steamID"
										target="_blank"
									>
										<img class="mr-2" :src="listing.user.avatarUrl" alt="user icon">
										<div
											class="number username text--text caption"
										>{{listing.user.username}}</div>
									</a>
								</div>
								<v-tooltip
									v-if="listing.item"
									top
									color="primary"
									class="replay absolute"
								>
									<v-btn
										slot="activator"
										small
										class="val ma-0"
										color="tertiary"
										:to="`/replay/${listing.caseID}`"
									>
										<fai :icon="['fas', 'undo']" class="dark--text icon caption"></fai>
									</v-btn>
									<span>Replay Animation</span>
								</v-tooltip>
								<v-tooltip v-else top color="primary" class="replay absolute">
									<v-btn
										slot="activator"
										small
										class="val ma-0"
										color="tertiary"
										:to="`/battle/${listing.id}`"
									>
										<fai :icon="['fas', 'eye']" class="dark--text icon caption"></fai>
									</v-btn>
									<span>View</span>
								</v-tooltip>
							</v-card>
						</transition-group>
					</div>
				</div>
			</v-navigation-drawer>

			<v-navigation-drawer
				class="dark sidebar pb-0"
				:width="sidebarActionWidth"
				v-model="self.toggles.sidebarChat"
				right
				clipped
				floating
				app
			>
				<div class="toggle text-center">
					<div class="mobile-close fw-bold text-uppercase">Close</div>
					<div
						class="button"
						@click="self.toggles.sidebarChat = !self.toggles.sidebarChat"
						:class="{closed: self.toggles.sidebarChat}"
					></div>
				</div>
				<sidebar-chat></sidebar-chat>
			</v-navigation-drawer>

			<v-content app>
				<transition name="fade" mode="out-in">
					<router-view v-if="!loading"></router-view>
				</transition>
			</v-content>

			<v-footer color="transparent" height="auto" inset app>
				<v-layout class="py-2 px-3" row wrap align-content-space-between>
					<v-flex align-center class="disp-flex">
						<div class="ctn">
							<small class="number disp-block secondary--text">
								&copy; {{ new Date().getFullYear() }}
								<b>LOOT</b>VGO.
								<span class="hide-mb">All Rights Reserved.</span>
							</small>
						</div>
					</v-flex>
					<v-flex>
						<div class="links">
							<div class="links-ctn disp-flex flex-center-y">
								<language-control class="mr-3"></language-control>
								<v-btn
									small
									flat
									class="mx-1 caption"
									color="primary"
									@click="$modal.open($root, 'terms', {persistent: !$ls.get('termsRead')})"
								>
									<fai :icon="['far','file-alt']" class="icon body-1 mr-2"></fai>
									<span>Terms and Privacy</span>
								</v-btn>
								<v-btn
									small
									flat
									class="mx-1 caption"
									color="primary"
									href="https://twitter.com/lootvgo"
									target="_blank"
								>
									<fai :icon="['fab','twitter']" class="icon body-1 mr-2"></fai>
									<span>Twitter</span>
								</v-btn>
							</div>
						</div>
					</v-flex>
				</v-layout>
			</v-footer>
		</v-app>
	</transition>
</template>

<script src="./interface.js"></script>
