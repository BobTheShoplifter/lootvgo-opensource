<template>
  <div class="page-content page-account">
    <transition name="scaleIn">
      <div class="loading absolute disp-flex flex-column flex-center" v-if="loading">
        <v-progress-circular class="mb-3" indeterminate color="primary" size="50"></v-progress-circular>
        <span class="text-uppercase fw-bold">Loading</span>
      </div>
    </transition>

    <v-jumbotron class="mb-3" height="350px" color="darker">

      <v-container class="disp-flex flex-center-y flex-column pt-4">
        <img :src="user.avatarUrl" alt="user icon" class="avatar mb-2">
        <div class="number title mb-2">{{user.username}}</div>
        <a class="number link text-faded-5 fw-bold caption text-uppercase" href="/logout">Logout</a>
      </v-container>

      <v-tabs class="absolute user-menu" centered height="50px" color="transparent" dark icons-and-text>
        <v-tabs-slider color="primary"></v-tabs-slider>

        <v-tab class="fw-bold" to="stats">
          Stats
        </v-tab>

        <v-tab class="fw-bold" to="history">
          History
        </v-tab>

        <!-- <v-tab class="fw-bold" to="inventory" v-if="me">
          Inventory
        </v-tab> -->

        <v-tab class="fw-bold" to="affiliates" v-if="me">
          Affiliates
        </v-tab>

      </v-tabs>
    </v-jumbotron>

    <transition name="scaleIn" mode="out-in">
      <router-view v-if="!loading" v-bind="props"></router-view>
    </transition>
  </div>
</template>

<style lang="scss" src="./user.scss" scoped></style>
<script src="./user.js"></script>