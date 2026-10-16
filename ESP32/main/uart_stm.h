#ifndef __UART_STM_H
#define __UART_STM_H

#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "esp_system.h"
#include "esp_log.h"
#include "driver/uart.h"
#include "string.h"
#include "driver/gpio.h"

void uart_stm_init(void);

void tx_cmd_task(void* arg);

void tx_task(void *arg);
void rx_task(void *arg);


#endif