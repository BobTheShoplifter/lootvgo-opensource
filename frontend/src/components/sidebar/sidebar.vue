<template>
  <div class="inner">
    <sidebar-chat></sidebar-chat>
  </div>
</template>

<script src="./sidebar.js"></script>
<style lang="scss" scoped>
@import '../../styles/variables.scss';

.inner {
  position: relative;
  height: 100%;
}

.tabs {
  height: 100%;
  display: flex;
  flex-direction: column;

  /deep/ {
    .tabs__items {
      flex: 1;
      height: 100%;

      .tabs__content {
        height: 100%;
      }
    }

    .tabs__container--grow .tabs__div {
      flex: 1;
    }

    .tabs__container {
      height: auto;
    }

    .tabs__item {
      display: flex;
      flex-direction: column;

      &.tabs__item--disabled svg {
        opacity: 0.5;
      }

      &:not(.tabs__item--active) {
        background: $darker;
      }
    }
  }
}
</style>

