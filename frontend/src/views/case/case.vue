<template>
	<div class="page-content page-case">
		<v-jumbotron
			class="mb-4"
			min-height="400px"
			gradient="to top, rgba(78, 161, 211, .8), rgba(78, 161, 211, .2)"
			src="/static/img/unbox-bg.png"
		>
			<div
				class="spinner-settings pb-2 pr-3 absolute fw-semibold disp-flex flex-center-y"
				@click="$modal.open($root, 'settings')"
			>
				<fai :icon="['far','cog']" class="icon subheading mr-2"></fai>Spinner Settings
			</div>
			<v-container class="disp-flex flex-center flex-column">
				<div class="spinner mb-4" :class="{rolling: rolling}">
					<div class="side-case left"></div>
					<div class="inner">
						<div class="entrylist disp-flex">
							<div
								class="item darker disp-flex flex-center"
								:class="{case: entry.special}"
								:rarity="entry.color"
								v-for="(entry, i) in entries"
								:key="i"
							>
								<img :src="entry.url">
								<transition name="scale">
									<div
										v-if="entry.price && showPrice"
										class="price number tertiary--text absolute fw-bold text-center"
									>
										${{entry.price
										| currencyInt}}
									</div>
								</transition>
							</div>
						</div>
					</div>
					<div class="side-case right"></div>
					<div class="arrow"></div>
				</div>

				<div class="status absolute" :class="{rolling: rolling}">
					<h1 v-if="selectedCase">
						{{vcase.name}}
						<small class="text-faded-5 number">#{{selectedCase.id}}</small>
					</h1>
					<h1 v-else-if="nextCase">No Case Selected</h1>
					<h1 v-else>You have no cases!</h1>
				</div>

				<div class="case disp-iflex flex-center" :class="{rolling: rolling}">
					<div
						class="logo-box"
						@click="selectedCase ? open() : vcase.remaining < 1 ? null : $modal.open($root, 'buyCase', {maxWidth: 400, persistent: true}, vcase)"
					>
						<div class="triangle"></div>
						<svg
							v-html="require('@/img/logo/icon.svg')"
							xmlns="http://www.w3.org/2000/svg"
							preserveAspectRatio="xMinYMin meet"
							viewBox="0 0 100 100"
						></svg>
					</div>

					<div v-if="selectedCase" class="disp-flex flex-center-y mt-1">
						<v-btn
							color="tertiary dark--text"
							class="has-glow ma-0 mr-2"
							@click="open()"
							:loading="opening.loading || opening.active"
						>
							<span class="mx-2 fw-bold">
								<fai :icon="['fas', 'gift']" class="mr-2"></fai>Unbox Loot
							</span>
						</v-btn>
						<v-tooltip top color="primary">
							<v-btn
								slot="activator"
								color="tertiary dark--text"
								class="val has-glow ma-0"
								@click="open(true)"
								:loading="opening.loading || opening.active"
							>
								<fai :icon="['fas', 'bolt']"></fai>
							</v-btn>
							<span>Quick-Open</span>
						</v-tooltip>
					</div>
					<v-btn
						v-else
						:disabled="vcase.remaining < 1"
						round
						color="tertiary dark--text"
						class="has-glow mt-1"
						@click="$modal.open($root, 'buyCase', {maxWidth: 400, persistent: true}, vcase)"
					>
						<span class="mx-2 fw-bold">Buy More Cases</span>
					</v-btn>

					<transition name="scale">
						<v-btn
							v-if="rolling"
							round
							small
							color="tertiary dark--text"
							class="skip has-glow mt-1"
							@click="skipAnim"
						>
							<span class="mx-2 fw-bold caption">Skip Animation</span>
						</v-btn>
					</transition>
				</div>
			</v-container>
		</v-jumbotron>

		<v-container grid-list-xl>
			<v-layout row wrap class="flex-no-shrink">
				<v-flex
					md12
					class="case-header disp-flex flex-between flex-wrap flex-center-y mb-4"
				>
					<div class="case-info disp-flex flex-center-y">
						<img :src="vcase.url" alt="case icon" class="case mr-3">
						<div class="meta">
							<div class="fw-bold display-1 mb-1">{{vcase.name}}</div>
							<div class="primary--text fw-semibold number">
								contains {{items.all.length}} items, ranging from
								${{items.highest.price | currencyInt}} - ${{items.lowest.price | currencyInt}}
							</div>
						</div>
					</div>

					<v-spacer></v-spacer>
					<div class="text-uppercase disp-flex flex-center-y mr-3">
						<div class="disp-flex flex-center-y mr-2">
							<v-switch hide-details color="primary" class="mr-2" v-model="autoOpen"></v-switch>
							<span class="secondary--text text-uppercase caption fw-bold">Auto Open</span>
						</div>
						<span class="ml-3 secondary--text caption fw-bold number">
							{{groupedCases.ready ? groupedCases.ready.length
							: 0}} ready
						</span>
						<span class="ml-3 secondary--text caption fw-bold number">
							{{groupedCases.pending ?
							groupedCases.pending.length : 0}} pending
						</span>
					</div>
					<v-btn
						large
						color="primary"
						class="has-glow"
						:disabled="vcase.remaining < 1"
						@click="$modal.open($root, 'buyCase', {maxWidth: 400, persistent: true}, vcase)"
					>
						<fai :icon="['fas', 'shopping-cart']" class="mr-2"></fai>Purchase More
					</v-btn>
				</v-flex>

				<v-flex md12 v-if="sessionHistorySorted.length">
					<div class="text-uppercase disp-flex flex-center-y mb-3">
						<h1 class="disp-flex fw-semibold flex-center-y title mr-2">
							<fai
								:icon="['far', 'box-open']"
								class="icon headline primary--text mr-3"
							></fai>Your Loot
						</h1>
						<span
							class="ml-3 secondary--text caption fw-bold number"
						>{{sessionHistorySorted.length}} items</span>
						<span class="ml-3 secondary--text caption fw-bold number">
							${{sessionHistorySorted.reduce((val, i) => val +
							i.item.price, 0) | currencyInt}} total
						</span>
						<span class="ml-3 secondary--text caption fw-bold number">
							${{sessionHistorySorted.reduce((val, i) => val +
							i.item.price, 0) - Math.floor(sessionHistorySorted.length * (250 * vcase.keysPerCase)) | currencyInt}}
							profit
						</span>

						<v-btn
							small
							flat
							v-if="!!sellAllItems.length"
							class="ma-0 ml-3"
							color="tertiary"
							@click="quickSellAll"
							:loading="sellLoading"
						>
							<span class="mx-2 caption text-uppercase fw-bold disp-flex flex-center">
								Sell all for
								<svg
									class="op-icon mx-1"
									v-html="require('@/img/opskins.svg')"
									xmlns="http://www.w3.org/2000/svg"
									viewBox="0 0 909 1250"
								></svg>
								<span
									class="number"
								>{{sellAllItems.reduce((val, i) => val + i.item.instant_sell_price, 0) | currencyInt}}</span>
							</span>
						</v-btn>

						<v-spacer></v-spacer>

						<v-flex class="sorting flex-no-grow">
							<v-menu offset-y left attach :close-on-content-click="false">
								<div slot="activator" class="dropdown">
									{{ $t('inventory.sorting.sortBy') }}
									<span
										class="fw-semibold"
									>{{$t(`inventory.sorting.${sorting.methods[sorting.current].label}`)}}</span>
									<fai :icon="['far','angle-down']" class="primary--text ml-1"></fai>
								</div>
								<v-list dense class="dark">
									<v-list-tile
										v-for="(item, i) in sorting.methods"
										:key="i"
										@click="sorting.current = i"
									>
										<v-list-tile-title
											class="fw-semibold mr-4"
											:class="{selected: sorting.current == i}"
										>
											<fai
												:icon="['fas','check']"
												class="primary--text mr-1"
												v-show="sorting.current == i"
											></fai>
											<span
												class="label text-caps"
											>{{$t(`inventory.sorting.${item.label}`)}}</span>
										</v-list-tile-title>
									</v-list-tile>

									<v-list-tile class="tertiary dark--text">
										<v-list-tile-title class="fw-semibold mr-5">
											<span
												class="text-uppercase fw-bold caption"
											>{{ $t('inventory.sorting.order') }}</span>
										</v-list-tile-title>
										<v-list-tile-action class="switch-action disp-flex flex-center-y">
											<span
												class="off px-2 text-uppercase caption fw-bold"
												:class="{active: !sorting.descending}"
												@click="sorting.descending = false"
											>{{$t(`inventory.sorting.${sorting.methods[sorting.current].labels.asc}`)}}</span>
											<v-switch
												hide-details
												color="darker"
												class="mx-2"
												v-model="sorting.descending"
											></v-switch>
											<span
												class="on ml-2 px-2 text-uppercase caption fw-bold"
												:class="{active: sorting.descending}"
												@click="sorting.descending = true"
											>{{$t(`inventory.sorting.${sorting.methods[sorting.current].labels.desc}`)}}</span>
										</v-list-tile-action>
									</v-list-tile>
								</v-list>
							</v-menu>
						</v-flex>
					</div>

					<transition-group name="scale" class="items-showcase disp-flex flex-wrap">
						<v-card
							class="item mx-2 mb-3 dark disp-flex flex-column flex-no-shrink"
							:class="{ vibrant:localSettings.vibrantItems, knife: box.item.type === 'knife' }"
							v-for="box in sessionHistorySorted"
							:key="box.id"
						>
							<figure
								class="disp-flex flex-center pa-3"
								:rarity="box.item.color"
								:style="{borderColor: box.item.color}"
							>
								<div
									class="price absolute caption fw-semibold tertiary--text number"
								>${{box.item.price | currencyInt}}</div>
								<img :src="box.item.url" alt="item">
								<div
									class="odds absolute caption fw-bold text-uppercase primary--text number"
								>{{box.item.wearShort}}</div>
							</figure>
							<v-card-text class="text-center flex-column">
								<div class="fw-semibold">{{box.item.skin || box.item.name}}</div>
								<div
									class="fw-bold caption text-faded-5 text-uppercase mb-3"
									:style="{color:box.item.color}"
								>{{box.item.category}}</div>

								<v-btn
									flat
									small
									:style="{color: box.item.color}"
									class="inspect-btn ma-0"
									@click="inspect(box.item)"
								>
									<span class="mx-2">
										<fai :icon="['fas', 'eye']" class="mr-2"></fai>Inspect
									</span>
								</v-btn>
								<v-tooltip color="primary" top>
									<v-btn
										slot="activator"
										flat
										small
										:style="{color: box.item.color}"
										class="val ml-1"
										@click="$modal.open($root, 'share', {maxWidth: 600}, box)"
									>
										<fai :icon="['fas', 'share']"></fai>
									</v-btn>
									<span>Share</span>
								</v-tooltip>
								<v-btn
									flat
									small
									v-if="!box.item.sold"
									class="ma-0"
									@click="quickSell(box.item)"
									:loading="sellLoading"
								>
									<span
										class="mx-2 caption text-uppercase fw-bold disp-flex flex-center"
									>
										Sell for
										<svg
											class="op-icon mx-1 primary--text"
											v-html="require('@/img/opskins.svg')"
											xmlns="http://www.w3.org/2000/svg"
											viewBox="0 0 909 1250"
										></svg>
										<span class="number">{{box.item.instant_sell_price| currencyInt}}</span>
									</span>
								</v-btn>
								<span v-else class="caption fw-bold tertiary--text">
									<fai :icon="['fas', 'check']" class="mr-1"></fai>SOLD
								</span>
							</v-card-text>
						</v-card>
					</transition-group>
				</v-flex>
			</v-layout>

			<v-layout row wrap class="content flex-no-shrink">
				<v-flex sm12 md12 lg7 xl8 class="items-in-case">
					<div class="header text-uppercase disp-flex flex-center-y mb-3">
						<h1 class="disp-flex fw-semibold flex-center-y title mr-2">
							<fai :icon="['far', 'star']" class="icon headline primary--text mr-3"></fai>Items in this case
						</h1>
						<div class="item-stats">
							<span
								class="ml-3 secondary--text caption fw-bold number"
							>{{vcase.items.length}} skins</span>
							<span
								class="ml-3 secondary--text caption fw-bold number"
							>{{items.knives.length / 5}} knives</span>
							<span
								class="ml-3 secondary--text caption fw-bold number"
							>{{items.weapons.length / 5}} weapons</span>
						</div>
					</div>

					<div class="items-showcase disp-flex flex-around flex-wrap mb-5">
						<v-card
							class="item mx-2 mb-3 dark disp-flex flex-column flex-no-shrink"
							:class="{ vibrant:localSettings.vibrantItems, knife: item.type === 'knife' }"
							v-for="item in skinsExpanded"
							:key="item.id"
						>
							<figure
								class="disp-flex flex-center pa-3"
								:rarity="item.color"
								:style="{borderColor: item.color}"
							>
								<div
									v-if="vcase.id < 1000"
									class="price absolute caption fw-semibold tertiary--text number"
								>${{item.highestPrice | currencyInt}} - ${{item.lowestPrice | currencyInt}}</div>
								<div
									v-else
									class="price absolute caption fw-semibold tertiary--text number"
								>${{item.highestPrice | currencyInt}}</div>
								<img :src="item.url" alt="item">
								<div
									v-if="item.odds"
									class="odds absolute caption fw-bold text-faded-5 primary--text number"
								>{{item.odds.toFixed(6)}}%</div>
							</figure>
							<v-card-text class="text-center flex-column">
								<div class="fw-semibold">{{item.skin || item.name}}</div>
								<div
									class="fw-bold caption text-faded-5 text-uppercase mb-3"
									:style="{color:item.color}"
								>{{item.category}}</div>

								<v-btn
									flat
									small
									:style="{color:item.color}"
									class="inspect-btn ma-0"
									@click="inspect(item)"
								>
									<span class="mx-2">
										<fai :icon="['fas', 'info']" class="mr-2"></fai>More Info
									</span>
								</v-btn>
							</v-card-text>
						</v-card>
					</div>

					<div class="disp-flex flex-center">
						<v-btn large color="primary" @click="expansionLevel++">Show more items</v-btn>
					</div>
					<!-- <h2 class="title fw-bold text-uppercase mb-4">All Available Skins</h2>
					<inventory class="mb-3" :items="items.all" :active="true" :loading="false"></inventory>-->
				</v-flex>

				<v-flex sm12 md12 lg5 xl4 class="case-history">
					<div class="header text-uppercase disp-flex flex-center-y mb-3">
						<h1 class="disp-flex fw-semibold flex-center-y title mr-2">
							<fai
								:icon="['far', 'box-open']"
								class="icon headline primary--text mr-3"
							></fai>Case History
						</h1>
						<span
							class="ml-3 secondary--text caption fw-bold number"
						>Last {{openedCases.length}} opened cases</span>
					</div>
					<div class="cases mb-4">
						<transition-group name="insert" mode="out-in">
							<v-card
								class="case-hor mb-2 dark px-2 disp-flex flex-center-y flex-no-shrink opened"
								v-for="box in openedCases"
								:key="box.id"
							>
								<img class="mr-3" :src="box.item.url" alt="item img">
								<div class="flex-grow" :style="{color: box.item.color}">
									<div class="fw-semibold number">{{box.item.skin || box.item.name}}</div>
									<div
										class="caption fw-bold text-faded-5 text-uppercase mb-1"
									>{{box.item.wear}}</div>
									<div
										class="number text--text subheading fw-semibold"
									>${{box.item.price | currencyInt}}</div>
								</div>
								<!-- <v-btn color="primary" class="ma-0 mr-2" @click="inspect(box.item)">Inspect</v-btn> -->
								<v-btn
									color="primary"
									class="ma-0"
									@click="$modal.open($root, 'share', {maxWidth: 600}, box)"
								>
									<fai :icon="['fas', 'share']" class="mr-2"></fai>Share
								</v-btn>
							</v-card>
						</transition-group>
					</div>
				</v-flex>
			</v-layout>
		</v-container>
	</div>
</template>

<style lang="scss" src="./case.scss" scoped></style>
<script src="./case.js"></script>
