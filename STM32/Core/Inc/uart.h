#ifndef __UART_H
#define __UART_H

#include "servo_control.h"
#include "stm32f4xx.h"

#define ESP_PCKT_LEN     2


typedef struct
{
    ServoDirection pan;
    ServoDirection tilt;
} servo_cmd_pckt_t;

extern volatile char msg_buffer[ESP_PCKT_LEN];
extern volatile uint8_t cmd_ready;
extern volatile uint8_t cmd_index;
extern volatile servo_cmd_pckt_t servo_cmd;


uint16_t calculate_brr(uint32_t periph_clk, uint32_t baudrate);

void uart_debug_init(void);
void uart_debug_init(void);
void uart_debug_tx_start(void);
void uart_debug_tx_stop(void);

void uart_esp_init(void);
void uart_esp_rx_start(void);
void uart_esp_rx_stop(void);

#endif