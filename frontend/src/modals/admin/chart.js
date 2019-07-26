import { Line } from 'vue-chartjs'

export default {
  extends: Line,
  props: ['data'],
  mounted() {
    this.renderChart(this.data, {
      responsive: true,
      maintainAspectRatio: false,
      lineTension: 0,
      scales: {
        xAxes: [
          {
            type: 'time',
            unit: 'day',
            unitStepSize: 1,
            time: {
              displayFormats: {
                day: 'MMM DD'
              }
            }
          }
        ]
      }
    })
  }
}
