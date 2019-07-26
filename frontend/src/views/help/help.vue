<template>
  <div class="page-content page-help">
    <div class="container pt-4">
      <div class="section header">
        <div class="primary--text">
          <div class="headline fw-bold">{{$t(`help.title`)}}</div>
          <p class="number">
            {{$t(`help.description`)}}
            <span v-if="supportLive">{{$t(`help.descriptionOnline`)}}</span>
            <span v-else>{{$t(`help.descriptionOffline`)}}</span>
          </p>
        </div>

        <v-text-field color="text" class="quaternary mb-3" solo :label="$t(`help.search`)" v-model="searchInput" prepend-icon="search"></v-text-field>
      </div>

      <v-layout row class="section content flex-no-shrink">
        <v-flex md3 class="category-sidebar pr-3">
          <h3 class="caption quaternary--text text-uppercase fw-bold mb-1">{{$t(`help.categories`)}}</h3>
          <v-list dense class="darker categories mb-2">
            <v-list-tile class="darker" href="#" ripple v-for="category in categories" :key="category" @click="scrollTo(category)">
              <v-list-tile-title class="text-caps" title>{{category}}</v-list-tile-title>
            </v-list-tile>
          </v-list>
          <v-btn block :loading="!this.tawkto" large color="quaternary" @click="tawkto.popup()">
            <span class=" fw-bold">
              <span v-if="supportLive">{{$t(`help.supportOnline`)}}</span>
              <span v-else>{{$t(`help.supportOffline`)}}</span>
            </span>
          </v-btn>
        </v-flex>
        <v-flex md9 class="cards pr-2">
          <div class="section mb-3" :id="'helpCardsScrollTo-'+category" v-for="(questions, category) in categorizedQuestions" :key="category">
            <h3 class="title text-uppercase fw-bold mb-2">{{category}}</h3>
            <v-expansion-panel dark class="ma-0" inset>
              <v-expansion-panel-content class="mb-1" v-for="(card, i) in questions" :key="i">
                <div slot="header" class="fw-semibold quaternary--text">{{card.question}}</div>
                <v-card color="darker">
                  <v-card-text class="number">{{card.answer}}</v-card-text>
                </v-card>
              </v-expansion-panel-content>
            </v-expansion-panel>
          </div>
          <h1 v-if="!filteredQuestions.length" class="title text-uppercase text-center text-faded-5 number">{{$t(`help.noQuestions`)}}</h1>
        </v-flex>
      </v-layout>

    </div>

  </div>
</template>

<script src="./help.js"></script>
<style lang="scss" src="./help.scss" scoped></style>
