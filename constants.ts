import { Question } from './types';

export const QUESTIONS: Question[] = [
  { id: 1, text: "¿El área se encuentra Organizada?" },
  { id: 2, text: "¿Los artículos se encuentran identificados correctamente en el área?" },
  { id: 3, text: "¿Los artículos fuera de ubicación están organizados e identificados correctamente?" },
  { id: 4, text: "¿Los artículos ubicados en el área están actualizados en sistema?" },
  { id: 5, text: "¿Las paletas colocadas después del nivel 3 se encuentran completas?" },
  { id: 6, text: "¿Están distribuidos debidamente los artículos en su área?" },
  { id: 7, text: "¿Son utilizados los espacios disponibles correctamente en el área?" },
  { id: 8, text: "¿El área se encuentra limpia y libre de obstrucciones?" },
  { id: 9, text: "¿Es conservada las 5S en el área? (Organización, Identificación y Limpieza)." },
  { id: 10, text: "¿Se está cumpliendo FIFO con los productos perecederos?" },
  { id: 11, text: "¿Los extintores están accesibles libres de obstáculos?" },
  { id: 12, text: "¿Están colocadas correctamente las paletas en los racks?" },
  { id: 13, text: "¿Están utilizando correctamente los escáner?" },
  { id: 14, text: "¿El personal está utilizando los EPIS mínimos en el área?" },
  { id: 15, text: "¿Los artículos averiados en el área fueron reportados con anterioridad?" },
  { id: 16, text: "¿Se están tomando medidas correctivas para disminuir las averías?" },
  { id: 17, text: "¿Están colocados correctamente los artículos en las tramerías?" },
];

export const AREA_MAPPING: { area: string; responsable: string }[] = [
  { area: "PINTURA", responsable: "ANTONIO JOSE" },
  { area: "JAULA", responsable: "JUAN" },
  { area: "ALAMBRES Y BOMBAS", responsable: "FABIO" },
  { area: "MEZZANINE P15-P18", responsable: "ENMEANUEL" },
  { area: "MEZZANINE P19-20", responsable: "RAILYN" },
  { area: "MEZZANINE NIVEL2", responsable: "MAICOR" },
  { area: "PASILLO P10-13", responsable: "NAZARIO" },
  { area: "PVC P8-9", responsable: "NELSON" },
  { area: "PASILLO P6-P7", responsable: "KELVIN" },
  { area: "CLAVO P2-P3", responsable: "ALVARO" },
  { area: "DRIVE", responsable: "WILLIAMS" },
  { area: "RECEPCION", responsable: "ANTONIO" },
  { area: "PASILLO P1", responsable: "EZEQUIEL" },
  { area: "MEZZANINE P21-P22", responsable: "RUNELDY" },
  { area: "PASILLO P4-P5", responsable: "ROVER" },
  { area: "LANCO", responsable: "ANGEL" },
  { area: "MEZZANINE P23-P25", responsable: "YOFRAISY" },
  { area: "PATIO", responsable: "JAMIL" },
  { area: "MADERA", responsable: "RAFAEL" },
];

export const AREAS = AREA_MAPPING.map(item => item.area);