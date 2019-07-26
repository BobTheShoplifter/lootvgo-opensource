<template>
	<div class="page-content page-replay">
		<transition name="scaleIn">
			<div
				class="loading absolute disp-flex flex-column flex-center"
				v-if="loading"
			>
				<v-progress-circular class="mb-3" indeterminate color="primary" size="50"></v-progress-circular>
				<span class="text-uppercase fw-bold">Loading Replay</span>
			</div>
		</transition>

		<v-jumbotron
			v-if="replayCase"
			class="mb-4"
			min-height="400px"
			gradient="to top, rgba(78, 161, 211, 1), rgba(78, 161, 211, 0.3)"
			src="/static/img/unbox-bg.png"
		>
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
									>${{entry.price | currencyInt}}</div>
								</transition>
							</div>
						</div>
					</div>
					<div class="side-case right"></div>
					<div class="arrow"></div>
				</div>

				<div class="status absolute" :class="{rolling: rolling}">
					<h1>
						{{vcase.name}}
						<small class="text-faded-5 number">#{{replayCase.caseID}}</small>
					</h1>
				</div>

				<div class="case disp-iflex flex-center" :class="{rolling: rolling}">
					<div class="logo-box" @click="roll()">
						<div class="triangle"></div>
						<svg
							v-html="require('@/img/logo/icon.svg')"
							xmlns="http://www.w3.org/2000/svg"
							preserveAspectRatio="xMinYMin meet"
							viewBox="0 0 100 100"
						></svg>
					</div>
					<div class="disp-flex flex-center-y mt-1">
						<v-btn
							color="tertiary dark--text"
							class="has-glow ma-0 mr-2"
							@click="roll()"
							:loading="rolling"
						>
							<span class="mx-2 fw-bold">
								<fai :icon="['fas', 'undo']" class="mr-2"></fai>Replay
							</span>
						</v-btn>
					</div>

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

		<v-container v-if="replayCase" grid-list-xl>
			<v-layout row wrap class="flex-no-shrink">
				<v-flex md12 class="case-header disp-flex flex-between flex-center-y mb-4">
					<div class="case-info disp-flex flex-center-y">
						<img :src="replayCase.user.avatarUrl" alt="case icon" class="case mr-3">
						<div class="meta">
							<div class="fw-bold display-1 mb-1">{{replayCase.user.username}}</div>
							<div
								class="primary--text fw-semibold number"
							>opened a "{{replayCase.item.name}}", worth ${{replayCase.item.price | currencyInt}}</div>
						</div>
					</div>

					<v-spacer></v-spacer>
					<v-btn small flat color="primary" :to="`/case/${vcase.id}`">View Case Info</v-btn>
					<v-btn
						large
						color="primary"
						class="has-glow"
						@click="$modal.open($root, 'buyCase', {maxWidth: 400, persistent: true}, vcase)"
					>
						<fai :icon="['fas', 'shopping-cart']" class="mr-2"></fai>
						Purchase Case {{vcase.id}}
					</v-btn>
				</v-flex>
			</v-layout>

			<v-layout row wrap class="content flex-no-shrink">
				<v-flex md12 class="items-in-case">
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
				</v-flex>
			</v-layout>
		</v-container>
	</div>
</template>

<style lang="scss" src="./replay.scss" scoped></style>
<script src="./replay.js"></script>
