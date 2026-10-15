#include "uart_stm.h"
#include "servo_cmd.h"

static const int RX_BUF_SIZE = 1024;

static QueueHandle_t uart_tx_queue;

#define TXD_PIN 4
#define RXD_PIN 5
#define UART_BAUD_RATE 115200

#define SERVO_FRAME_START 0xAA


void uart_stm_init(void)
{
    uart_tx_queue = xQueueCreate(1, sizeof(servo_cmd_t));

    if (uart_tx_queue == NULL)
    {
        ESP_LOGE("UART", "Failed to create UART queue");
        return;
    }

    const uart_config_t uart_config = {
        .baud_rate = UART_BAUD_RATE,
        .data_bits = UART_DATA_8_BITS,
        .parity = UART_PARITY_DISABLE,
        .stop_bits = UART_STOP_BITS_1,
        .flow_ctrl = UART_HW_FLOWCTRL_DISABLE,
        .source_clk = UART_SCLK_DEFAULT,
    };
    // We won't use a buffer for sending data.
    uart_driver_install(UART_NUM_1, RX_BUF_SIZE * 2, 0, 0, NULL, 0);
    uart_param_config(UART_NUM_1, &uart_config);
    uart_set_pin(UART_NUM_1, TXD_PIN, RXD_PIN, UART_PIN_NO_CHANGE, UART_PIN_NO_CHANGE);
}

void uart_add_servo_cmd(const servo_cmd_t* cmd)
{
    xQueueOverwrite(uart_tx_queue, cmd);
}

int sendData(const char* logName, const char* data)
{
    const int len = strlen(data);
    const int txBytes = uart_write_bytes(UART_NUM_1, data, len);
    ESP_LOGI(logName, "Wrote %d bytes", txBytes);
    return txBytes;
}

void tx_task(void *arg)
{
    static const char *TX_TASK_TAG = "TX_TASK";
    esp_log_level_set(TX_TASK_TAG, ESP_LOG_INFO);
    while (1) {
        sendData(TX_TASK_TAG, "Hello world");
        vTaskDelay(2000 / portTICK_PERIOD_MS);
    }
}

void tx_cmd_task(void* arg)
{
    servo_cmd_t cmd;
    static const char *TX_TASK_TAG = "TX_CMD_TASK";
    esp_log_level_set(TX_TASK_TAG, ESP_LOG_INFO);

    while (1) {
        if (xQueueReceive(uart_tx_queue, &cmd, portMAX_DELAY) == pdTRUE) {

            const uint8_t cmd_frame[3] = {
                SERVO_FRAME_START,
                (uint8_t) cmd.pan,
                (uint8_t) cmd.tilt
            };

            const int txBytes = uart_write_bytes(UART_NUM_1, &cmd, sizeof(cmd_frame));
            if (txBytes == -1) {
                ESP_LOGE("SERVO_CMD_TX", "Failed to send cmd through UART");
            }
            else {
                ESP_LOGI(TX_TASK_TAG, "Wrote %d command bytes (Pan: %d, Tilt: %d)", txBytes, cmd.pan, cmd.tilt);
            }
        }
    }
}

void rx_task(void *arg)
{
    static const char *RX_TASK_TAG = "RX_TASK";
    esp_log_level_set(RX_TASK_TAG, ESP_LOG_INFO);
    uint8_t* data = (uint8_t*) malloc(RX_BUF_SIZE + 1);
    while (1) {
        const int rxBytes = uart_read_bytes(UART_NUM_1, data, RX_BUF_SIZE, 1000 / portTICK_PERIOD_MS);
        if (rxBytes > 0) {
            data[rxBytes] = 0;
            ESP_LOGI(RX_TASK_TAG, "Read %d bytes: '%s'", rxBytes, data);
            ESP_LOG_BUFFER_HEXDUMP(RX_TASK_TAG, data, rxBytes, ESP_LOG_INFO);
        }
    }
    free(data);
}
