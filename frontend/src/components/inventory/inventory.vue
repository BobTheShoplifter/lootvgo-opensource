<template>
  <div v-if="!!itemSets.length && !loading" class="inventory-ctn">
    <recycle-list class="inventory-items" emit-update @update="renderCallback" :items="itemSets" :itemHeight="rowHeight">
      <template slot-scope="{ item, index }">
        <div class="item-row" :key="index">
          <item v-for="i in item" :key="i.id" :item="i"></item>
        </div>
      </template>
    </recycle-list>
    <resize-observer @notify="resize" />
  </div>

  <div class="inventory-ctn no-items" v-else>
    <v-progress-circular v-if="loading" indeterminate color="primary" :size="100"></v-progress-circular>
    <span v-else class="title text-uppercase">{{$t('inventory.noItems')}}</span>
  </div>

</template>

<script src="./inventory.js"></script>
<style src="./inventory.scss" lang="scss" scoped></style>