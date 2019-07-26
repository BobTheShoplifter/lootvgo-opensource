<template>
  <div class="item filler" v-if="renderedItem.filler"></div>
  <div class="item" v-else :class="{ vibrant: vibrant, knife: item.type === 'knife', selected: item.selected, problem: item.sold }" title="Right-click for more info"
    @click="selectItem">
    <figure :rarity="renderedItem.color" @contextmenu.prevent="inspect">
      <div class="price number">${{renderedItem.price | currencyInt}}</div>

      <div class="condition">{{renderedItem.wearShort}}</div>
      <div class="image" :style="{backgroundImage: `url(${renderedItem.url})`}"></div>
      <div class="meta" v-ripple>
        <div class="item-info">
          <div class="name">
            {{renderedItem.skin || renderedItem.name}}
          </div>
          <div v-if="item.sold" class="red--text fw-bold caption">SOLD</div>
        </div>
      </div>
    </figure>
  </div>
</template>

<script>
export default {
  name: 'item',
  props: ['item'],
  store: ['localSettings'],
  data() {
    return {
      renderedItem: this.item
    }
  },
  methods: {
    inspect() {
      this.$modal.open(
        this,
        'inspect',
        {
          maxWidth: 400,
          scrollable: false
        },
        this.renderedItem
      )
    },
    selectItem() {
      if (this.item.sold) return
      this.$set(this.item, 'selected', !this.item.selected)
    }
  },
  computed: {
    vibrant() {
      return this.localSettings.vibrantItems
    }
  }
}
</script>

<style lang="scss" scoped>
@import '../../styles/variables.scss';

.item {
  contain: paint;
  margin: 0 5px;
  min-width: 100px;
  max-width: 150px;
  flex: 1;
  cursor: pointer;

  &.filler {
    cursor: unset;
  }

  &.knife .image {
    background-size: 140% 140%;
    transform: rotate(20deg);
  }

  &.vibrant figure .image {
    filter: brightness(110%) saturate(150%);
  }

  // perf
  transform: translateZ(0);
  backface-visibility: hidden;

  &:first-child {
    margin-left: 0;
  }

  &:last-child {
    margin-right: 0;
  }

  &:before {
    content: '';
    width: 1px;
    margin-left: -1px;
    float: left;
    height: 0;
    padding-top: 100%;
  }

  figure {
    position: relative;
    display: flex;
    align-items: center;

    height: 100%;
    background: $darker;

    overflow: hidden;

    margin: 0;
    padding: 10px;
    border-radius: 8px;

    transition: background 1s ease;

    .image {
      position: absolute;
      left: 0;
      top: 0;
      padding: 5px;
      width: 100%;
      height: 100%;
      min-height: 70px;
      z-index: 1;
      background-position: center center;
      background-size: 90% 90%;
      background-repeat: no-repeat;
    }

    .price {
      position: absolute;
      bottom: 0;
      z-index: 2;
      font-weight: bold;
      padding: 8px 2px;
      color: $text;
      font-size: 14px;
      font-family: $family-secondary;
      text-shadow: 0 0 4px black;
    }

    .condition {
      position: absolute;
      top: 0;
      right: 0;
      z-index: 2;
      padding: 5px 10px;
      font-weight: bold;
      color: $primary;
      font-size: 14px;
      font-family: $family-primary;
    }

    .meta {
      position: absolute;
      display: flex;
      flex-direction: column-reverse;
      justify-content: center;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      padding: 8px;
      background: rgba($darker - 20, 0.9);
      opacity: 0;
      z-index: 3;
      transition: opacity 0.5s ease;

      .item-info {
        user-select: none;
        color: white;
        width: 100%;
        font-size: 14px;
        font-weight: 600;
        text-align: center;
        font-family: $family-primary;

        .name {
          transform: translateY(40px);
          opacity: 0;
          transition: transform 0.3s ease, opacity 0.3s ease;
        }

        .float {
          transform: translateY(50px);
          position: absolute;
          bottom: 0;
          left: 0;
          width: 100%;
          transition: transform 0.3s 0.1s ease;
          min-height: 20px;
          font-family: $family-secondary;

          .arrow {
            width: 0;
            height: 0;
            border-left: 8px solid transparent;
            border-right: 8px solid transparent;
            border-top: 8px solid $tertiary;
            margin-left: -8px;
            border-radius: 25px;
            filter: drop-shadow(0 0 10px black);
            z-index: 5;
            position: absolute;
            bottom: 5px;
          }

          .float-bar {
            width: 100%;
            position: absolute;
            bottom: 0;
            left: 0;

            .bar {
              height: 6px;
              float: left;

              &.fn {
                background-color: green;
                width: 7%;
              }

              &.mw {
                background-color: rgb(92, 184, 92);
                width: 8%;
              }

              &.ft {
                background-color: rgb(240, 173, 78);
                width: 23%;
              }

              &.ww {
                background-color: rgb(217, 83, 79);
                width: 7%;
              }

              &.bs {
                background-color: rgb(153, 58, 56);
                width: 55%;
              }
            }
          }
        }
      }

      .problem {
        width: 100%;
        text-align: center;
        font-family: $family-secondary;
        text-transform: uppercase;
        font-weight: 600;

        .gone {
          text-align: center;
          width: 100%;

          .icon {
            display: block;
            margin: 0 auto;
            font-size: 25px;
            margin-bottom: 5px;
            color: #e74c3c;
          }

          small {
            display: block;
            text-transform: initial;
            font-size: 10px;
          }
        }
        .overstock {
          color: orange;
        }
        .blacklisted {
          color: red;
          font-weight: bold;
          text-transform: uppercase;
        }
        .unstack {
          color: yellow;
          font-size: 10px;
        }
      }

      &:hover {
        opacity: 1;

        .name {
          transform: translateY(0);
          opacity: 1;
        }

        .float {
          transform: translateY(0);
        }
      }
    }
    // rarity backgrounds
    &[rarity='#4b69ff'] {
      background: linear-gradient(to bottom right, rgba(#4b69ff, 0.5), rgba($darker, 0.5));
    }
    &[rarity='#8847ff'] {
      background: linear-gradient(to bottom right, rgba(#8847ff, 0.5), rgba($darker, 0.5));
    }
    &[rarity='#d32ee6'] {
      background: linear-gradient(to bottom right, rgba(#d32ee6, 0.5), rgba($darker, 0.5));
    }
    &[rarity='#FFD700'] {
      background: linear-gradient(to bottom right, rgba(#ffd700, 0.5), rgba($darker, 0.5));
    }
    &[rarity='#eb4b4b'] {
      background: linear-gradient(to bottom right, rgba(#eb4b4b, 0.5), rgba($darker, 0.5));
    }
    &[rarity='#9abaeb'] {
      background: linear-gradient(to bottom right, rgba(#9abaeb, 0.5), rgba($darker, 0.5));
    }
  }

  &.selected {
    figure {
      background: rgba($primary, 0.5);
    }
  }

  &.problem {
    cursor: no-drop;

    figure {
      background: rgba(black, 0.5);

      .meta {
        opacity: 0.8;

        .name {
          transform: translateY(0);
          opacity: 1;
        }
      }

      img {
        opacity: 0.2;
      }

      .condition,
      .price {
        display: none;
      }
    }
  }

  &.disabled {
    cursor: no-drop;
  }
}
</style>

